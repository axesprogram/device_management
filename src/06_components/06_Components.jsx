export const FileInput = ({ name, value, onChange, isBusy }) => (
    <div className={`relative border-2 border-dashed border-[#d1d1d6] rounded-2xl p-4 bg-white transition-all ${isBusy ? 'opacity-50' : 'hover:bg-[#f8f8fa]'}`}>
        {value && typeof value === 'string' && <AssetImagePreview url={value} />}
        <input 
            type="file" 
            name={name} 
            onChange={onChange} 
            disabled={isBusy}
            className="w-full text-xs text-[#6B6B80] file:mr-3 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#D6D6E0] file:text-[#4A4A4A] cursor-pointer" 
            accept="image/*" 
        />
        {value && !isBusy && <div className="text-[10px] text-[#94a38d] mt-2 font-bold"><i className="fas fa-check-circle"></i> 已有存檔</div>}
    </div>
);

export const StandardInput = ({ name, value, type, placeholder, onChange, onBlur, validation }) => {
    return (
        <input 
            type={type}
            name={name}
            value={value || ''}
            placeholder={placeholder}
            onChange={onChange}
            onBlur={onBlur}
            className={`w-full border border-[#b0b8c2] rounded-xl px-3 py-2 text-[#5e6472] 
                        focus:outline-none focus:ring-2 focus:ring-[#7c909c] text-sm transition-all bg-white`}
        />
    );
};

// 載入中的遮罩零件
export const LoadingOverlay = () => {
    return (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-xl z-20 shadow-sm border border-[#E2E2EB]">
            <i className="fas fa-circle-notch fa-spin text-[#6B6B80] text-xl"></i>
            <span className="mt-2 text-[9px] font-black text-[#6B6B80] tracking-widest uppercase">Saving...</span>
        </div>
    );
};