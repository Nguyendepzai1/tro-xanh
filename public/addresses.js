const normalizeAddress=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().trim();
const cityKey=value=>{const name=normalizeAddress(value).replace(/^(tinh\s+|thanh pho\s+|tp[.\s]*)/,'').trim();return ['sai gon','saigon','hcm'].includes(name)?'ho chi minh':name;};
const provinceValue=p=>p.name.replace(/^(Tỉnh|Thành phố)\s+/,'');
let countryCatalog=null,countryRequest=null,areaVersion=0,countryWardCount=0;
async function loadCountry(){if(countryCatalog)return countryCatalog;if(!countryRequest)countryRequest=api('/address-catalog').then(data=>{countryCatalog=data.items;countryWardCount=data.ward_count;return countryCatalog;}).catch(e=>{countryRequest=null;throw e;});return countryRequest;}
cityOptions=function(selected=''){return '<option value="">Tất cả tỉnh/thành phố</option>'+(countryCatalog||[]).map(p=>`<option value="${esc(provinceValue(p))}" ${cityKey(selected)===cityKey(p.name)?'selected':''}>${esc(p.name)}</option>`).join('');};
function renderAreaOptions(select,query='',selected=''){
 const items=JSON.parse(select.dataset.options||'[]'),q=normalizeAddress(query),active=selected||select.value;
 select.innerHTML=`<option value="">${select.required?'Chọn phường/xã của phòng':'Tất cả phường/xã, khu vực'}</option>`+['current','legacy'].map(group=>{const options=items.filter(x=>x.group===group&&(!q||normalizeAddress(x.name).includes(q)||x.name===selected));return options.length?`<optgroup label="${group==='current'?'Phường/xã/đặc khu hiện hành':'Khu vực theo địa chỉ cũ'}">${options.map(x=>`<option value="${esc(x.name)}" ${x.name===active?'selected':''}>${esc(x.name)}</option>`).join('')}</optgroup>`:'';}).join('');
 const count=$('#area-count');if(count)count.textContent=q?`${select.options.length-1} khu vực phù hợp`:`${items.filter(x=>x.group==='current').length} phường/xã/đặc khu · Địa chỉ cũ được giữ riêng`;
}
async function fillAreas(city,selected='',posting=false){
 const v=++areaVersion,select=$('#district');if(!select)return;const province=countryCatalog?.find(p=>cityKey(p.name)===cityKey(city));
 if($('#area-name-filter'))$('#area-name-filter').disabled=!province;
 if(!province){select.innerHTML='<option value="">Chọn tỉnh/thành phố trước</option>';select.disabled=true;const count=$('#area-count');if(count)count.textContent='Chọn tỉnh/thành để xem các phường/xã, đặc khu.';return;}
 select.disabled=true;select.innerHTML='<option>Đang tải danh mục khu vực…</option>';
 const [p,legacy]=await Promise.all([api('/address-catalog/'+province.code),api('/locations')]);
 if(v!==areaVersion||select!==$('#district'))return;
 const options=p.wards.map(w=>({name:w.name,group:'current'}));
 for(const l of legacy.filter(l=>cityKey(l.city)===cityKey(city)))if(!options.some(x=>x.name===l.district))options.push({name:l.district,group:'legacy'});
 if(selected&&!options.some(x=>x.name===selected))options.push({name:selected,group:'legacy'});
 select.dataset.options=JSON.stringify(options);select.disabled=false;select.required=posting;renderAreaOptions(select,'',selected);
 if(posting)select.options[0].textContent='Chọn phường/xã của phòng';
}
function areaControls(){const select=$('#district');if(!select)return;const label=$('label[for="district"]');if(label)label.textContent='Phường/xã · Khu vực';if($('#area-name-filter'))return;
 const tools='<div class="area-search-tools"><label for="area-name-filter">Tìm nhanh khu vực</label><input id="area-name-filter" type="search" aria-label="Tìm nhanh tên khu vực" placeholder="Gõ tên phường/xã, có thể không dấu" autocomplete="off"><span id="area-count" role="status" aria-live="polite"></span></div>';
 const row=$('.search-primary')||select.closest('.row');row.insertAdjacentHTML('afterend',tools);
}
const searchBeforeNationwide=searchPage;
searchPage=async function(params,version){await loadCountry();if(version!==renderVersion)return;await searchBeforeNationwide(params,version);if(version!==renderVersion)return;$('#city').innerHTML=cityOptions(params.get('city')||'');$('label[for="city"]').textContent='Tỉnh / Thành phố';$('.search-heading').insertAdjacentHTML('beforeend',`<div class="search-coverage"><span class="coverage-dot" aria-hidden="true"></span>${countryCatalog.length} tỉnh/thành phố <span aria-hidden="true">·</span> ${new Intl.NumberFormat('vi-VN').format(countryWardCount)} phường/xã, đặc khu</div>`);areaControls();await fillAreas(params.get('city')||'',params.get('district')||'');};
const homeBeforeNationwide=home;
home=async function(version){await loadCountry();if(version!==renderVersion)return;await homeBeforeNationwide(version);if(version!==renderVersion)return;const label=$('label[for="hero-city"]');if(label)label.childNodes[0].textContent='TỈNH / THÀNH PHỐ';};
const postBeforeNationwide=postPage;
postPage=async function(id,version){await loadCountry();if(version!==renderVersion)return;await postBeforeNationwide(id,version);if(version!==renderVersion||!$('#listing-form'))return;
 const cityInput=$('#city'),districtInput=$('#district'),city=cityInput.value,district=districtInput.value;
 cityInput.outerHTML=`<select name="city" id="city" required>${cityOptions(city)}</select>`;
 districtInput.outerHTML='<select name="district" id="district" required></select>';
 const cityField=$('#city').closest('.field'),districtField=$('#district').closest('.field');
 districtField.parentElement.insertBefore(cityField,districtField);
 $('label[for="city"]').textContent='Tỉnh / Thành phố';areaControls();await fillAreas(city,district,true);
};
document.addEventListener('change',async event=>{if(event.target.id==='city'){if($('#area-name-filter'))$('#area-name-filter').value='';try{await fillAreas(event.target.value,'',!!$('#listing-form'));}catch(e){toast('Chưa tải được danh mục địa chỉ: '+e.message);}}});
document.addEventListener('input',event=>{if(event.target.id==='area-name-filter'&&$('#district'))renderAreaOptions($('#district'),event.target.value);});
