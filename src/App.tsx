import React from 'react';

function App() {
  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'Arial' }}>
      <h1 style={{ color: 'green' }}>✅ REACT IS WORKING!</h1>
      <p style={{ fontSize: '18px' }}>This is the simplest possible React app.</p>
      <p>If you can see this, the deployment is successful.</p>
      <button onClick={() => alert('JavaScript is working!')}>
        Test JavaScript
      </button>
    </div>
  );
}

export default App;
