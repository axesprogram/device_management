export const Field = memo(({ name, label, type, validation, width, isEditing, ...props }) => {
    const { isBusy, handleBlur, handleChange } = useFieldLogic(name, props.validation, props.onChange);

    return (
        <div className={`mb-6 px-2 relative ${width || "w-full"} transition-all`}>
            <label className="morandi-field-tag mb-1.5 block">{label}</label>
            
            <div className="relative group">
                {isEditing ? (
                    // 編輯模式：渲染輸入框
                    <StandardInput 
                        {...props} 
                        name={name}
                        type={type}
                        onChange={handleChange} 
                        onBlur={handleBlur} 
                    />
                ) : (
                    // 唯讀模式：渲染純文字，保持同樣的高度與樣式
                    <div className="w-full px-3 py-2 bg-gray-50 border border-transparent rounded-lg text-gray-700 min-h-[40px] flex items-center">
                        {props.value || <span className="text-gray-400 italic">無資料</span>}
                    </div>
                )}
                {isEditing && isBusy && <LoadingOverlay />}
            </div>
        </div>
    );
});