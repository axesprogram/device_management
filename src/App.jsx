import React from 'react';

// 這裡不需要 import 任何 00_core, 02_providers 等檔案！
// 因為在 main.jsx 裡我們已經用 glob 把全站的模組都載入記憶體了。

function App() {
  return (
    // 如果你已經有全域的 Provider，可以直接在這裡使用
    // 例如：<AppProvider><AuthProvider><div id="main">...</div></AuthProvider></AppProvider>
    
    <div className="app-container">
      <h1>安興國小資訊設備管理系統</h1>
      
      {/* 這裡直接呼叫你的組件，組件會自動從全域範圍找到對應的 Hook 或 Context */}
      {/* <MainComponent /> */}
      
      <p>系統已自動載入所有模組。</p>
    </div>
  );
}

export default App;