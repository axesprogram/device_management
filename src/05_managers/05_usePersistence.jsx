export const usePersistence = () => {
    const { execGas } = useConfig();
    
    // 業務核心方法
    const saveAllData = async (editingDeviceData, roomDevices, appConfig) => {
        // A. 準備資料
        const allDevices = [...roomDevices];
        appConfig.CUSTOM_SPACES.forEach(cat => {
            if (!cat.is_multiple) {
                const single = editingDeviceData[cat.id];
                if (single?.id) allDevices.push({ ...single });
            }
        });

        // B. 一次性呼叫後端中樞
        // 我們將 editingDeviceData 與所有的設備陣列整包傳過去
        await execGas('saveEntireRoom', [editingDeviceData, allDevices, adminToken], { 
            showSuccess: true 
        });

        showToast('✅ 空間與設備資料已完整同步', 'success');
        return true;
    };

    return { saveAllData };
};