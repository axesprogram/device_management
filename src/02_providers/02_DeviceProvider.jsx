export const DeviceProvider = ({ children }) => {
    const [devices, setDevices] = useState([]);
    const [activeDeviceId, setActiveDeviceId] = useState(null);
    const [activeTab, setActiveTab] = useState('pc');
    return (
        <DeviceContext.Provider value={{ 
            devices, setDevices, 
            activeDeviceId, setActiveDeviceId, 
            activeTab, setActiveTab
        }}>
            {children}
        </DeviceContext.Provider>
    );
};