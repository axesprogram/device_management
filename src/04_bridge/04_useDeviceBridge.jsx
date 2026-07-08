import { callApi } from '../api'; // 匯入你的 API 工具
import { GAS_MAP } from '../apiConstants'; // 匯入你的對應表

export const useDeviceBridge = () => {
    const { devices, setDevices, activeTab, activeDeviceId } = useDevice();

    const actions = {
        add: (newDevice) => setDevices(prev => [...prev, newDevice]),

        reset: (originalDevices) => {
            setDevices(JSON.parse(JSON.stringify(originalDevices)));
        },

        // 這裡修改：加入 API 呼叫
        update: async (newDevices, callback) => {
            setDevices(newDevices); // 1. 先更新 UI
            try {
                // 2. 呼叫後端同步
                await callApi(GAS_MAP.SYNC_ASSET_DATA, { devices: newDevices });
                if (callback) callback(newDevices);
            } catch (err) {
                console.error("同步失敗:", err);
            }
        },

        // 這裡修改：這是最常用的欄位更新
        updateField: async (deviceId, key, value, callback) => {
            if (deviceId === undefined || deviceId === null) return;
            
            // 1. 先更新 UI
            setDevices(prev => {
                const nextDevices = prev.map(d => 
                    String(d.id) === String(deviceId) ? { ...d, [key]: value } : d
                );
                return nextDevices;
            });

            // 2. 呼叫後端
            try {
                // 這裡傳送的是該 device 的變動數據
                await callApi(GAS_MAP.SAVE_DEVICE_DATA, { deviceId, key, value });
                if (callback) callback();
            } catch (err) {
                console.error("遠端更新失敗:", err);
                // 這裡你可以考慮做一個「還原」動作，或者通知使用者連線斷開
            }
        }
    };

    const selectors = useMemo(() => ({
        getActiveDevice: (activeTab, activeDeviceId) => {
            const categoryDevices = devices.filter(d => d.deviceType === activeTab);
            
            if (categoryDevices.length === 0) {
                const newDevId = `dev_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                return { id: newDevId, deviceType: activeTab, isVirtual: true };
            }
            
            const found = categoryDevices.find(d => String(d.id) === String(activeDeviceId));
            return found || categoryDevices[0];
        },

        viewData: (appConfig) => {
            if (!appConfig) {
                return { textFields: [], publicPC: {} };
            }

            // 在這裡定義哪些類型不應該進入 textFields 渲染迴圈
            const excludedTypes = ['file', 'canvas', 'image'];

            // 2. 正常計算
            return {
                // 確保濾掉所有類型不符的欄位
                textFields: (appConfig.BASE_FIELDS || []).filter(f => 
                    !excludedTypes.includes(f.type)
                ),
                publicPC: devices.find(d => d.deviceType === 'public') || {}
            };
        }
    }), [devices]);

    return { state: devices, actions, selectors, getters: {} };
};