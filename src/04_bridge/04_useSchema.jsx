export const useSchema = () => {
    const { appConfig } = useConfig();
    return useMemo(() => ({
        registry: appConfig?.SCHEMA_REGISTRY || {},
        getMapping: (type) => (appConfig?.SCHEMA_REGISTRY || {})[type]?.mapping || { KEY: 'locCode' }
    }), [appConfig]);
};