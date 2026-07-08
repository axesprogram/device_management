export const useValidation = () => {
    // 內部輔助函式，處理共用的比對規則
    const normalize = (val) => (val === null || val === undefined || val === "") ? "" : String(val).trim();
    
    const isObjectChanged = (objA, objB, ignoreKeys = []) => {
        const allKeys = Array.from(new Set([...Object.keys(objA || {}), ...Object.keys(objB || {})]));
        return allKeys.some(key => {
            if (ignoreKeys.includes(key)) return false;
            return normalize(objA?.[key]) !== normalize(objB?.[key]);
        });
    };

    const checkSpaceDirty = (orig, curr, excluded) => {
        return isObjectChanged(orig, curr, excluded);
    };

    const checkDevicesDirty = (original, current) => {
        return JSON.stringify(original) !== JSON.stringify(current);
    };

    // 總檢測
    const checkIsDirty = (originalData, currentData, currentDevices, excludedKeys) => {
        const spaceDirty = checkSpaceDirty(originalData.space, currentData, excludedKeys);
        const devicesDirty = checkers.device(originalData.devices, currentDevices);
        return spaceDirty || devicesDirty;
    };

    // --- 守門員區 (Validate) ---
    const validators = {
        device: (dev) => {
            const strictIpRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
            if (dev.ip && !strictIpRegex.test(dev.ip)) return `設備 ${dev.name} IP 格式錯誤`;
            return null;
        },
        space: (space) => {
            if (!space.locCode) return "空間代碼不可為空";
            return null;
        }
    };

    // --- 偵探區 (Dirty Check) ---
    const checkers = {
        device: (saved, current) => {
            if (current.length !== saved.length) return true;
            const savedMap = new Map(saved.map(d => [String(d.id), d]));
            return current.some(curr => isObjectChanged(savedMap.get(String(curr.id)) || {}, curr, ['updatedAt', 'lastModified']));
        },
        space: (saved, current) => isObjectChanged(saved, current, ['updatedAt', 'lastModified'])
    };

    return { validators, checkers, checkSpaceDirty, checkDevicesDirty, checkIsDirty };
};