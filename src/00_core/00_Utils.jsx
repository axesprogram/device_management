export const execGas = async (actionKey, params = [], options = { showSuccess: true }) => {
    // 檢查環境：若非 GAS 環境，執行 Mock 資料 (方便開發)
    if (typeof google === 'undefined' || !google.script) {
        return simulateBackend(actionKey, params);
    }

    const backendFunctionName = GAS_MAP[actionKey];
    if (!backendFunctionName) throw new Error(`未定義的後端函式: ${actionKey}`);

    return new Promise((resolve, reject) => {
        google.script.run
            .withSuccessHandler(res => {
                // 統一格式：確保後端回傳的 res 具有一致性
                if (res?.success === false) reject(res.message || "後端請求失敗");
                else resolve(res);
            })
            .withFailureHandler(err => reject(err.toString()))
            [backendFunctionName](...params);
    });
};

export const formatToROC = (input) => {
    if (!input) return "";
    
    // 1. 先把非數字的東西（如原本的斜線）清掉，方便統一處理
    let num = input.replace(/\D/g, '');
    
    // 2. 只有在輸入 6 位 (990101) 或 7 位 (1130101) 時才自動格式化
    if (num.length === 6 || num.length === 7) {
        const y = num.slice(0, num.length - 4);            // 年份 (可能是 2 位或 3 位)
        const m = num.slice(num.length - 4, num.length - 2); // 月份
        const d = num.slice(num.length - 2);               // 日期 (修正點：dd -> d)

        // 加個簡單的防呆：如果月、日明顯不合理，就不強行轉換
        const month = parseInt(m);
        const day = parseInt(d);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return `${y}/${m}/${d}`;
        }
    }
    
    // 如果長度不對或格式怪異，就原樣回傳，讓使用者手動修正
    return input; 
};
    
// --- 扁平化資料組裝 ---
export const parseRoomLayout = (roomLayoutRaw) => {
    const defaultValue = { items: [], lines: [] };

    if (!roomLayoutRaw) return defaultValue;

    // 如果已經是物件 (可能是從後端傳來時被自動轉成了物件)
    if (typeof roomLayoutRaw === 'object') {
        return roomLayoutRaw;
    }

    // 如果是字串
    if (typeof roomLayoutRaw === 'string') {
        try {
            // 嘗試解析
            return JSON.parse(roomLayoutRaw);
        } catch (e) {
            console.error("配置圖解析錯誤，嘗試修復:", e);
            // 這裡可以加入額外的修復邏輯，例如 replace 掉不合法的字元
            return defaultValue;
        }
    }
    
    return defaultValue;
};
    
// IP / MAC 清洗工具 (移出組件以利單元測試)
export const getCleanValue = (val, key = "") => {
    if (!val) return "";
    const s = String(val).trim();
    const lowerK = key.toLowerCase();
    if (lowerK.includes('ip')) return s.replace(/[^\d.]/g, '');
    if (lowerK.includes('mac')) return s.replace(/[^\da-fA-F]/g, '').toUpperCase().match(/.{1,2}/g)?.join(':') || '';
    return s
};

export const assembleData = (rawRow, appConfig) => {
    if (!rawRow || typeof rawRow !== 'object' || !appConfig?.INVENTORY) {
        return rawRow || {};
    }

    // 1. 建立深層副本以避免影響原始參考
    const assembled = { ...rawRow };

    /**
     * 輔助函式：提取單一設備的所有欄位資訊
     * 這讓組裝的物件不僅有 ID，還包含了設備的具體資料
     */
    const extractDeviceData = (prefix, index) => {
        const searchPrefix = `${prefix}_${index}_`;
        const deviceData = { id: `${prefix}_${index}`, index };
        let hasData = false;

        Object.keys(rawRow).forEach(key => {
            if (key.startsWith(searchPrefix)) {
                const cleanKey = key.replace(searchPrefix, ''); // 移除前綴，只留屬性名
                deviceData[cleanKey] = rawRow[key];
                
                // 只要有一個屬性有值，就認定該設備存在
                const val = rawRow[key];
                if (val !== null && val !== undefined && String(val).trim() !== '') {
                    hasData = true;
                }
            }
        });

        return hasData ? deviceData : null;
    };

    // 2. 使用 Config 配置驅動 (Data-Driven)，而非硬編碼
    appConfig.INVENTORY.forEach(dev => {
        if (dev.max <= 1) return;

        // 💡 透過 Config 直接定義陣列名稱，若未定義則使用 `dev.id + '_list'`
        const listKey = dev.listKey || `${dev.id}_list`;
        assembled[listKey] = [];

        for (let i = 1; i <= dev.max; i++) {
            const deviceDetails = extractDeviceData(dev.prefix, i);
            if (deviceDetails) {
                assembled[listKey].push(deviceDetails);
            }
        }
    });

    // 3. 處理 RoomLayout (加入空值保護)
    assembled.roomLayout = parseRoomLayout(rawRow.roomLayout);

    return assembled;
};