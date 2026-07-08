export const useConfig = () => {
    const context = React.useContext(ConfigContext);
    if (!context) {
        throw new Error("useConfig 必須在 ConfigProvider 內使用！");
    }
    return context;
};