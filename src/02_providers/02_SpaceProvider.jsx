export const SpaceProvider = ({ children }) => {
    const { appConfig, setAppConfig } = useConfig();
    
    const [spaces, setSpaces] = useState([]);
    const [editingLayoutData, setEditingLayoutData] = useState([]);
    const [originalLayoutData, setOriginalLayoutData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null); // 擴充：錯誤處理

    // 擴充：將撈取資料封裝成可重複呼叫的函式
    const refreshData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await execGas('GET_INITIAL_DATA', []);
            if (res?.success) {
                setSpaces(res.spaces || []);
                setAppConfig(res.config || {});
            } else {
                throw new Error(res?.message || "資料取得失敗");
            }
        } catch (err) {
            console.error("初始化資料失敗:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 初始載入
    useEffect(() => {
        refreshData();
    }, [refreshData]);

    // 這裡定義 Context 提供出去的 value
    const value = useMemo(() => ({
        spaces,
        appConfig,
        isLoading,
        error,
        refreshData
    }), [spaces, appConfig, isLoading, error, refreshData]);

    return (
        <SpaceContext.Provider value={value}>
            {children}
        </SpaceContext.Provider>
    );
};