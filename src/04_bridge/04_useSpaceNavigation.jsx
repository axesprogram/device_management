import { callApi } from '../api';
import { GAS_MAP } from '../apiConstants';

export const useSpaceNavigation = () => {
    const { spaces } = useSpace();
    const { setView, setEditingLayoutData, setOriginalLayoutData } = useNavigationStore();
    
    // 這裡我們把 execGas 換成 callApi
    const navigateToSpaceDetail = useCallback(async (locCode) => {        
        const cached = spaces.find(item => 
            String(item.locCode || '').trim().toUpperCase() === String(locCode).trim().toUpperCase()
        );

        if (!cached) return;

        try {
            setIsLoading(true); // 記得補上這行，原本程式碼有但被隱藏了

            // 1. 組裝空間資料 (保持原狀)
            const layoutData = {
                ...cached,
                items: cached.items ? JSON.parse(cached.items) : [],
                lines: cached.lines ? JSON.parse(cached.lines) : []
            };

            setEditingLayoutData(layoutData);
            // 這裡原本程式碼有 fullData，確認一下來源是否正確
            setOriginalLayoutData(prev => ({ ...prev, space: JSON.parse(JSON.stringify(layoutData)) }));

            // 2. [修改重點] 改為 callApi 呼叫
            const res = await callApi(GAS_MAP.GET_PROPERTIES, { locCode });

            if (res.status === 'success') {
                const { devices, roomLayout } = res.data;
                const assembledLayout = parseRoomLayout(roomLayout);
                
                setLayout(assembledLayout);
                
                // 3. 更新狀態
                deviceActions.update(devices);
                setOriginalLayoutData(prev => ({ ...prev, devices: JSON.parse(JSON.stringify(devices)) }));
                
                setView('detail');
            }
        } catch (err) {
            console.error("抓取設備失敗:", err);
            showToast("抓取設備失敗：" + err.message, "error");
        } finally {
            setIsLoading(false);
        }
    }, [spaces, showToast, deviceActions, setView, setIsLoading, setEditingLayoutData, setOriginalLayoutData]);

    return { navigateToSpaceDetail };
};