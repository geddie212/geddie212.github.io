const {defineConfig} = require('@playwright/test');
module.exports=defineConfig({testDir:'tests',timeout:60000,workers:1,use:{baseURL:'http://127.0.0.1:4173',channel:'chrome',headless:true,screenshot:'only-on-failure'},webServer:{command:'node scripts/serve.cjs',url:'http://127.0.0.1:4173',reuseExistingServer:true},reporter:'list'});
