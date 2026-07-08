export const useSpace = () => {
    const context = React.useContext(SpaceContext);
    if (!context) {
        throw new Error("useSpace 必須在 SpaceProvider 內使用！");
    }
    return context;
};