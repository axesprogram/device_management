export const useSpaceManager = (editingLayoutData, setEditingLayoutData, setIsDirty, execGas, withPermission) => {
    const handleRemovePhoto = (index) => {
        const newPhotos = (editingLayoutData.photos || []).filter((_, i) => i !== index);
        setEditingLayoutData(prev => ({ ...prev, photos: newPhotos }));
        setIsDirty(true);
    };

    const handleSpacePhotoUpload = useCallback(async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // withPermission 是你原本的權限檢查
        withPermission(async () => {
            try {
                const compressedBase64 = await compressImage(file);
                
                // 這裡改用你的 execGas，設定 showSuccess: true 因為這是用戶主動上傳
                const result = await execGas('UPLOAD_SPACE_PHOTO', [compressedBase64, editingLayoutData.locCode], { 
                    showSuccess: true 
                });

                if (result?.url) {
                    setEditingLayoutData(prev => ({
                        ...prev,
                        photos: [...(prev.photos || []), result.url]
                    }));
                    setIsDirty(true);
                }
            } catch (error) {
                // execGas 已經處理了 Toast 錯誤提示，這裡只需處理額外的邏輯 (如果有的話)
                console.error("Space Photo Upload Error:", error);
            }
        });
    }, [editingLayoutData, execGas, withPermission, setEditingLayoutData, setIsDirty]);

    return { handleRemovePhoto, handleSpacePhotoUpload };
};