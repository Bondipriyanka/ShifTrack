const fs = require('fs');

global.window = global;
global.document = {
  getElementById: (id) => ({
    value: '',
    innerText: '',
    innerHTML: '',
    style: {},
    classList: { add: ()=>{}, remove: ()=>{}, toggle: ()=>{} },
    appendChild: ()=>{},
    querySelectorAll: ()=>[],
    querySelector: ()=>null,
    addEventListener: ()=>{}
  }),
  addEventListener: ()=>{},
  querySelectorAll: ()=>[],
  querySelector: ()=>null,
  createElement: (tag) => ({
    value: '',
    innerText: '',
    innerHTML: '',
    style: {},
    classList: { add: ()=>{}, remove: ()=>{}, toggle: ()=>{} },
    appendChild: ()=>{}
  })
};
global.localStorage = {
  getItem: (k) => JSON.stringify({id:'LF687INT20', name:'Muthuraj A', pin:'1234', primaryLocation:'Mahindra (MWC) - Mahindra World City'}),
  setItem: (k, v) => {},
  removeItem: (k) => {}
};
global.fetch = () => Promise.resolve({ json: () => Promise.resolve({}) });

try {
  const code = fs.readFileSync('app-v3.js', 'utf8');
  eval(code);
  console.log('App loaded. Testing loginWithSavedQuickSupervisor()...');
  loginWithSavedQuickSupervisor();
  console.log('Testing handleSupervisorLogin()...');
  handleSupervisorLogin();
  console.log('Testing selectPlantOption("PLANT-03")...');
  selectPlantOption('PLANT-03');
  console.log('ALL TESTS PASSED WITH ZERO ERRORS!');
} catch (e) {
  console.error('CRASH DETECTED:', e);
}
