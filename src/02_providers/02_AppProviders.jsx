export const AppProviders = ({ children }) => {
    return (
        <ConfigProvider>
            <SpaceProvider>
                <AuthProvider>
                    <DeviceProvider>
                        {children}
                    </DeviceProvider>
                </AuthProvider>
            </SpaceProvider>
        </ConfigProvider>
    );
};