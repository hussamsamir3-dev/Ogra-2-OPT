import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cleanLocal,number,integer,levelFor,garagePatch,UUID} from '../functions/_shared/policy.mjs';
const catalog=JSON.parse(readFileSync(new URL('../functions/_shared/catalog.json',import.meta.url)));
const vehicle=catalog.vehicles.find(v=>v.id==='v_n300');
const own={upgrades:{engine:1},cosmetics:{paint:'#ffffff',stk:[]}};
test('nonfinite, strings and fractional integer values are refused',()=>{
 for(const v of [NaN,Infinity,-Infinity,'5',null,undefined])assert.throws(()=>number(v,0,100,'input'));
 assert.throws(()=>integer(1.5,0,5,'tier'));assert.equal(integer(3,0,5,'tier'),3);
});
test('sync strips economy keys and preserves permitted settings only',()=>{
 assert.deepEqual(cleanLocal({cash:1e9,owned:{x:{}},name:' Driver ',set:{vol:{master:.5},driverPlus:{coach:true},cash:500}}),{name:'Driver',set:{vol:{master:.5},driverPlus:{coach:true}}});
 assert.deepEqual(cleanLocal({}),{});
});
test('settings reject prototype keys, deeply nested payloads and oversized values',()=>{
 assert.throws(()=>cleanLocal(JSON.parse('{"set":{"driverPlus":{"__proto__":{"admin":true}}}}')));
 assert.throws(()=>cleanLocal({set:{driverPlus:{a:{b:{c:{}}}}}}));
 assert.throws(()=>cleanLocal({name:'a'.repeat(61)}));
});
test('upgrades price every gained tier; never store unclamped input',()=>{
 const p=garagePatch({upgrades:{engine:3}},own,vehicle,catalog);
 assert.equal(p.upgrades.engine,3);assert.equal(p.cost,Math.round(1200*1.85)+Math.round(1200*1.85**2));
 for(const n of [-1,0,1.5,6,1e10,Infinity,'4'])assert.throws(()=>garagePatch({upgrades:{engine:n}},own,vehicle,catalog));
 assert.throws(()=>garagePatch({upgrades:{freeMoney:5}},own,vehicle,catalog));
});
test('real workshop sticker and rim payloads round trip',()=>{
 const stickers=[{t:'OGRA',pos:'side',col:'#ffffff'}];
 const p=garagePatch({upgrades:{engine:1},cosmetics:{paint:'#aabbcc',paint2:null,tint:2,stk:stickers,rims:[vehicle.rim]},stickers},own,vehicle,catalog);
 assert.deepEqual(p.cosmetics.stk,stickers);assert.ok(p.cosmetics.rims.includes(vehicle.rim));assert.equal(p.cosmetics.paint2,null);
});
test('cosmetics reject unknown fields and markup',()=>{
 assert.throws(()=>garagePatch({cosmetics:{admin:true}},own,vehicle,catalog));
 assert.throws(()=>garagePatch({cosmetics:{paint:'red; background:url(x)'}},own,vehicle,catalog));
 assert.throws(()=>garagePatch({stickers:[{t:'<img onerror=alert(1)>',pos:'side'}]},own,vehicle,catalog));
});
test('catalog has complete fuel rules and valid route compression',()=>{
 for(const v of catalog.vehicles){assert.ok(v.tank>0&&v.lp100>0);assert.ok(catalog.fuels[v.fuel]);}
 for(const r of catalog.routes){assert.ok(r.gameM>0&&r.km>0&&r.stops>=2)}
});
test('level curve preserves legacy thresholds and allows level 22+',()=>{
 assert.equal(levelFor(0),1);assert.equal(levelFor(220),2);assert.equal(levelFor(22857),21);assert.ok(levelFor(1000000)>=22);
});
test('request IDs are constrained',()=>{assert.equal(UUID.test(crypto.randomUUID()),true);assert.equal(UUID.test('anything'),false)});
