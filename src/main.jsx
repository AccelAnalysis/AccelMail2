import React from 'react'
import ReactDOM from 'react-dom/client'
import AccelMailApp from '../AccelMail2.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(
    React.StrictMode,
    null,
    React.createElement(AccelMailApp)
  ),
)
