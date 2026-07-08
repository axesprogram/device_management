import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // 你的主元件
import './index.css';    // 你的樣式

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);