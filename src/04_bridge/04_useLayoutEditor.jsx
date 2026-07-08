import { callApi } from '../api';
import { GAS_MAP } from '../apiConstants';

export const useLayoutEditor = () => {
    const { editingLayoutData, setEditingLayoutData, originalDeviceData, setOriginalDeviceData } = useConfig();

    return {
        data: editingLayoutData,
        update: setEditingLayoutData, // 維持原狀，讓 UI 反應快速
        
        reset: useCallback(() => {
            if (originalDeviceData.space) {
                setEditingLayoutData(JSON.parse(JSON.stringify(originalDeviceData.space)));
            }
        }, [originalDeviceData]),

        // 這裡修改：整合 API 儲存
        persist: useCallback(async (newData) => {
            try {
                // 1. 同步到後端 API
                await callApi(GAS_MAP.SAVE_SPACE_DATA, { space: newData });
                
                // 2. 成功後更新本地狀態
                setOriginalDeviceData({ space: JSON.parse(JSON.stringify(newData)) });
                
                return { success: true };
            } catch (err) {
                console.error("Layout 儲存失敗:", err);
                return { success: false, error: err.message };
            }
        }, [setOriginalDeviceData])
    };
};