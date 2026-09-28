const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');fs.mkdirSync(path.join(root,'.local'),{recursive:true});process.env.DATA_DIR=fs.mkdtempSync(path.join(root,'.local/test-menu-'));process.env.BOT_AUTOSTART='false';
test('all new user/admin menu routes render valid, bounded messages',async()=>{
  const firebase=require('../lib/firebase');firebase.isAdmin=id=>String(id)==='99';firebase.checkUserAuthorized=async()=>({authorized:true});firebase.getMaintenance=async()=>({active:false});firebase.getBroadcastUsers=async()=>({});
  const collector=require('../lib/collector');collector.fetchChannel=async()=>({ok:false,error:'test offline'});
  const original=global.fetch,calls=[];global.fetch=async(url,options)=>{
    if(String(url).includes('api.telegram.org')){calls.push(JSON.parse(options.body));return {json:async()=>({ok:true,result:{message_id:42}})};}
    return {ok:true,json:async()=>({data:[{ban:'11',results:'BBPTP',update_at:new Date().toISOString()}],phien:1,status:'Đang chờ',summary:{shoe:10},du_doan:'Example team',ty_le:{home:1.5}})};
  };
  const bot=require('../bot');try{
    for(const data of ['back_main','portals_tx_0','portals_md5_0','portals_sicbo_0','portals_xocdia_0','portals_all_3','rates_0','rates_5','help_menu','ai_detail_sunwin_tx','pred_sunwin_tx','external_sexy2_0','external_sexy2table_11','external_sexy1menu_0','external_sexy1_1','external_volta']){
      const before=calls.length;await bot.handleCallbackQuery({id:data,data,from:{id:1,first_name:'User'},message:{message_id:42,chat:{id:1,type:'private'}}});
      const rendered=calls.slice(before).find(c=>c.chat_id===1&&c.text);assert.ok(rendered,data);assert.ok(rendered.text.length<4096,data+' length');assert.ok(!rendered.text.includes('undefined'),data);assert.ok(!rendered.text.includes('NaN'),data);
      for(const row of rendered.reply_markup?.inline_keyboard||[])for(const button of row)if(button.callback_data)assert.ok(Buffer.byteLength(button.callback_data)<=64);
    }
  }finally{bot.stop();global.fetch=original;}
});
