import React from 'react';
import ReactDOM from 'react-dom';
import './styles/tailwind.css';
import App from './App';

// Initialize Intercom
window.intercomSettings = {
  app_id: process.env.REACT_APP_INTERCOM_APP_ID || 'your_intercom_app_id',
};
(function(){var w=window;var ic=w.Intercom;if(typeof ic==="function"){ic('reattach_activator');ic('update',w.intercomSettings);}else{var d=document;var i=function(){i.c(arguments);};i.q=[];i.c=function(args){i.q.push(args);};w.Intercom=i;var l=function(){var s=d.createElement('script');s.type='text/javascript';s.async=true;s.src='https://widget.intercom.io/widget/' + (process.env.REACT_APP_INTERCOM_APP_ID || 'your_intercom_app_id');var x=d.getElementsByTagName('script')[0];x.parentNode.insertBefore(s,x);};if(w.attachEvent){w.attachEvent('onload',l);}else{w.addEventListener('load',l,false);}}})();

ReactDOM.render(<App />, document.getElementById('root'));