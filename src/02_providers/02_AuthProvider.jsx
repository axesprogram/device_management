export const AuthProvider = ({ children }) => {
    const [adminToken, setAdminToken] = useState(IS_DEV_MODE ? 'DEV_TOKEN_123' : '');
    const [user, setUser] = useState(null);

    const { showToast, triggerConfirm } = useConfig();

    const withPermission = useCallback((action) => {
        // 🚀 如果是開發模式，直接放行
        if (IS_DEV_MODE) {
            return action();
        }

        if (!adminToken) {
            showToast("此功能僅供管理員使用，請先登入", "info");
            setLoginModalOpen(true);
            return;
        }
        action();
    }, [adminToken, showToast]);

    const logout = useCallback(() => {
        triggerConfirm("確定登出？", () => {
            setAdminToken(null);
            setUser(null);
            showToast('已登出', 'info');
        });
    }, [triggerConfirm, setAdminToken, showToast]);
    
    return (
        <AuthContext.Provider value={{ adminToken, setAdminToken, user, setUser, withPermission, logout }}>
            {children}
        </AuthContext.Provider>
    );
};