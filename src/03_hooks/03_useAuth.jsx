export const useAuth = () => {
    // 1. 只讀取 Context
    const context = React.useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    
    const { adminToken, setLoginModalOpen, setPendingAction } = context;

    // 2. 將邏輯封裝在內部，並確保名稱符合你在 Manager 裡面的呼叫
    const withPermission = useCallback((action, intentType) => {
        if (IS_DEV_MODE) return action();

        if (!adminToken) {
            if (intentType) setPendingAction({ type: intentType });
            setLoginModalOpen(true);
            return;
        }

        action();
    }, [adminToken, setLoginModalOpen, setPendingAction]);

    // 3. 回傳所有需要的屬性
    return { 
        ...context, 
        withPermission 
    };
};
