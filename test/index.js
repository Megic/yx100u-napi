const assert = require('assert');
const cvr = require('../index');

describe('test com port connect', () => {

  it('should open USB successfully', () => {

    const { error } = cvr.SDT_SelectIDCard(1001);
    console.log(error,'xx1');
    assert(error === 0);
  });
  it('should read idcard successfully', () => {
    let res = cvr.SDT_StartFindIDCard(1001);
    res =cvr.SDT_SelectIDCard(1001);
   
    if(!res.error)  res =cvr.SDT_ReadBaseMsg(1001);
  
    console.log(res);
    assert(res.error === 0);
   // cvr.SDT_ClosePort(1001);
  });
  after(() => {
   // cvr.SDT_ClosePort(1001);
  });
});

