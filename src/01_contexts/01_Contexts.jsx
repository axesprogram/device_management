    // 資料相關狀態
export const ConfigContext = React.createContext(null);
export const useConfig = () => React.useContext(ConfigContext);

// 空間相關狀態
export const SpaceContext = React.createContext(null);
export const useSpace = () => React.useContext(SpaceContext);

// 設備相關狀態
export const DeviceContext = React.createContext(null);
export const useDevice = () => React.useContext(DeviceContext);

// 權限相關狀態
export const AuthContext = React.createContext(null);
export const useAuth = () => React.useContext(AuthContext);