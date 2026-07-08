export const useDevice = () => {
    const context = React.useContext(DeviceContext);
    if (!context) {
        throw new Error("useDevice 必須在 DeviceProvider 內使用！");
    }
    return context;
};