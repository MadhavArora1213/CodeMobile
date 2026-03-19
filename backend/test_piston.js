require('dotenv').config();
const axios = require('axios');

async function testPiston() {
  try {
    const payload = {
      language: 'javascript',
      version: '18.15.0',
      files: [
        {
          name: 'main.js',
          content: 'console.log("Hello, Piston!");'
        }
      ],
      stdin: "",
      args: [],
      compile_timeout: 10000,
      run_timeout: 3000
    };
    const pistonUrl = process.env.PISTON_URL || 'https://piston.coderunner.sh/api/v2/execute';
    console.log(`Sending payload to Piston at: ${pistonUrl}`);
    const response = await axios.post(pistonUrl, payload);
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Piston Request Failed!');
    if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
        console.error('Error:', error.message);
    }
  }
}

testPiston();
