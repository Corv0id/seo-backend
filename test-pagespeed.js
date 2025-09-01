require('dotenv').config();

const axios = require('axios');

async function testPageSpeedApi() {
  try {
    const response = await axios.get('https://www.googleapis.com/pagespeedonline/v5/runPagespeed', {
      params: {
        url: 'https://example.com',
        key: process.env.GOOGLE_API_KEY
      }
    });

    console.log('PageSpeed Insights API Test Successful:');
    console.log('Status:', response.status);
    console.log('Performance Score:', response.data.lighthouseResult.categories.performance.score);
    console.log('Response Sample:', JSON.stringify(response.data.lighthouseResult.audits['first-contentful-paint'], null, 2));
  } catch (error) {
    console.error('PageSpeed Insights API Test Failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testPageSpeedApi();