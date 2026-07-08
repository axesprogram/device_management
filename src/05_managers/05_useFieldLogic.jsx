export const useFieldLogic = (name, validation, onChange) => {
    const { uploadingFields } = useConfig();
    const isBusy = uploadingFields?.[name];

    const handleBlur = (e) => {
        if (name.includes('date')) {
            const formatted = formatToROC(e.target.value);
            if (formatted !== e.target.value) {
                onChange({ target: { name, value: formatted } });
            }
        }
    };

    const handleChange = (e) => {
        let val = e.target.value;
        // 驗證邏輯保留在這裡是正確的，因為這是「輸入時」的行為
        if (validation === 'mac') {
            val = val.toUpperCase().replace(/[^A-Z0-9:]/g, '');
        } else if (['ip', 'ram', 'number'].includes(validation)) {
            val = val.replace(/[^0-9]/g, '');
        }
        onChange({ ...e, target: { ...e.target, value: val } });
    };
    
    return { isBusy, handleBlur, handleChange };
};