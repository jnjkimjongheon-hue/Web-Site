/* -----------------------------------------
 * 1. 글로벌 데이터 및 상태 모델
 * ----------------------------------------- */
let bgPage = Math.floor(Math.random() * 10) + 1; 

const CITIES = [
    { id: 'ansan', name: '안산 (한국)', tz: 'Asia/Seoul', lat: 37.3236, lon: 126.8309 },
    { id: 'hcmc', name: '호치민 (베트남)', tz: 'Asia/Ho_Chi_Minh', lat: 10.8231, lon: 106.6297 },
    { id: 'ny', name: '뉴욕 (미국)', tz: 'America/New_York', lat: 40.7128, lon: -74.0060 },
    { id: 'london', name: '런던 (영국)', tz: 'Europe/London', lat: 51.5074, lon: -0.1278 },
    { id: 'tokyo', name: '도쿄 (일본)', tz: 'Asia/Tokyo', lat: 35.6762, lon: 139.6503 },
    { id: 'paris', name: '파리 (프랑스)', tz: 'Europe/Paris', lat: 48.8566, lon: 2.3522 },
    { id: 'sydney', name: '시드니 (호주)', tz: 'Australia/Sydney', lat: -33.8688, lon: 151.2093 },
    { id: 'dubai', name: '두바이 (UAE)', tz: 'Asia/Dubai', lat: 25.2048, lon: 55.2708 },
    { id: 'berlin', name: '베를린 (독일)', tz: 'Europe/Berlin', lat: 52.5200, lon: 13.4050 },
    { id: 'singapore', name: '싱가포르', tz: 'Asia/Singapore', lat: 1.3521, lon: 103.8198 },
    { id: 'la', name: 'LA (미국)', tz: 'America/Los_Angeles', lat: 34.0522, lon: -118.2437 }
];

const DEFAULT_DATA = {
    theme: 'dark', 
    bgUrl: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=2070&auto=format&fit=crop',
    selectedCities: ['ansan', 'hcmc'], 
    activeTabId: 't1',
    tabs: [
        {
            id: 't1', name: '업무 메인',
            items: [
                { type: 'folder', id: 'f1', name: '업무 관련 사이트', emoji: '📂', links: [{ type: 'link', id: 'l1', title: 'Notion', url: 'https://notion.so' }] },
                { type: 'link', id: 'l2', title: 'Firebase 콘솔', url: 'https://console.firebase.google.com' }
            ]
        }
    ],
    todos: [{ id: 'td1', text: '베트남 선적 일정 확인', done: false }]
};

let appData = JSON.parse(localStorage.getItem('vibe_pro_data')) || DEFAULT_DATA;
let currentOpenFolderId = null; 
let contextTarget = null; 
let dragState = { id: null, parentId: null, type: null };
let weatherDataCache = {};

/* -----------------------------------------
 * 2. 코어 유틸 (토스트 알림 및 보안 우회)
 * ----------------------------------------- */
function saveData() { try { localStorage.setItem('vibe_pro_data', JSON.stringify(appData)); } catch (e) { showToast("저장 실패 (로컬 용량 초과)", true); } }
function factoryReset() { if(confirm("모든 설정이 초기화됩니다. 계속할까요?")) { localStorage.removeItem('vibe_pro_data'); appData = JSON.parse(JSON.stringify(DEFAULT_DATA)); saveData(); goBack(); fetchWeathers(); } }

function showToast(msg, isError = false) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    if(isError) toast.style.background = '#ef4444';
    toast.innerHTML = `<i data-lucide="${isError ? 'alert-circle' : 'check-circle'}"></i> ${msg}`;
    container.appendChild(toast);
    lucide.createIcons();
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

function copyChromeUrl(url) { 
    navigator.clipboard.writeText(url).then(() => {
        showToast(`'${url}' 복사 완료! 새 탭(Ctrl+T)에서 붙여넣기 하세요.`);
    }).catch(() => showToast("복사 실패. 수동으로 입력해주세요.", true)); 
}

function applyThemeAndBg() { 
    document.documentElement.style.setProperty('--bg-image', `url('${appData.bgUrl}')`); 
    if(appData.theme === 'light') { document.body.classList.add('light-mode'); document.getElementById('themeToggleBtn').innerHTML = '<i data-lucide="moon"></i>'; } 
    else { document.body.classList.remove('light-mode'); document.getElementById('themeToggleBtn').innerHTML = '<i data-lucide="sun"></i>'; } 
}
function toggleTheme() { appData.theme = appData.theme === 'light' ? 'dark' : 'light'; saveData(); applyThemeAndBg(); lucide.createIcons(); }
function getFaviconUrl(url) { try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=128`; } catch(e) { return null; } }

/* -----------------------------------------
 * 3. 무제한 배경화면 (Picsum API)
 * ----------------------------------------- */
async function loadNextBgPage() {
    const grid = document.getElementById('presetBgGrid');
    grid.innerHTML = '<div class="loader"><i data-lucide="loader" class="spin"></i> 불러오는 중...</div>';
    lucide.createIcons();
    bgPage++;
    try {
        const res = await fetch(`https://picsum.photos/v2/list?page=${bgPage}&limit=6`);
        const data = await res.json();
        grid.innerHTML = '';
        data.forEach(imgData => {
            const img = document.createElement('img');
            img.src = `https://picsum.photos/id/${imgData.id}/400/200`; 
            img.className = `preset-img ${appData.bgUrl === imgData.download_url ? 'active' : ''}`;
            img.onclick = () => { appData.bgUrl = imgData.download_url; saveData(); applyThemeAndBg(); document.querySelectorAll('.preset-img').forEach(el=>el.classList.remove('active')); img.classList.add('active'); showToast("배경이 적용되었습니다.");};
            grid.appendChild(img);
        });
    } catch (e) {
        grid.innerHTML = '<div class="loader">이미지를 불러오는데 실패했습니다.</div>';
    }
}
function handleFileUpload(event) { const file = event.target.files[0]; if(file) { const reader = new FileReader(); reader.onload = (e) => { try { appData.bgUrl = e.target.result; saveData(); applyThemeAndBg(); showToast("내 이미지 적용 완료!"); } catch(err) { showToast("용량이 너무 큽니다 (2MB 이하 권장).", true); } }; reader.readAsDataURL(file); } }
function saveBackgroundUrl() { const url = document.getElementById('bgUrlInput').value.trim(); if(url) { appData.bgUrl = url; saveData(); applyThemeAndBg(); showToast("URL 배경 적용 완료!"); } }

/* -----------------------------------------
 * 4. 인플레이스(In-place) 폴더 및 드래그 앤 드롭
 * ----------------------------------------- */
function renderAll() { applyThemeAndBg(); renderTodos(); renderTabs(); renderMainGrid(); lucide.createIcons(); }

function openFolderView(folderId) { currentOpenFolderId = folderId; renderMainGrid(); lucide.createIcons(); }
function goBack() { currentOpenFolderId = null; renderMainGrid(); lucide.createIcons(); }

function renderMainGrid() {
    const grid = document.getElementById('mainGrid');
    const folderHeader = document.getElementById('folderHeader');
    const activeTab = appData.tabs.find(t => t.id === appData.activeTabId);
    if(!activeTab) return;
    grid.innerHTML = '';

    if (currentOpenFolderId) {
        const folder = activeTab.items.find(i => i.id === currentOpenFolderId);
        folderHeader.style.display = 'flex'; document.getElementById('folderTitle').innerHTML = `${folder.emoji} ${folder.name}`;
        if (folder.links.length === 0) grid.innerHTML = '<div style="grid-column: 1/-1; color: var(--text-sub); padding: 2rem;">폴더가 비어있습니다. 북마크를 추가하세요.</div>';
        
        folder.links.forEach(link => {
            const div = document.createElement('div'); div.className = 'item-card'; 
            div.onclick = () => window.open(link.url, '_blank');
            div.oncontextmenu = (e) => showContextMenu(e, 'link', link.id, folder.id);
            attachDragEvents(div, link, folder.id);
            const iconSrc = link.customIcon || getFaviconUrl(link.url);
            div.innerHTML = `<div class="icon-box"><img src="${iconSrc}" class="favicon-img" onerror="this.style.display='none';"><i data-lucide="globe" style="display:none; width:28px;"></i></div><span class="item-title">${link.title}</span>`;
            grid.appendChild(div);
        });
    } else {
        folderHeader.style.display = 'none';
        activeTab.items.forEach(item => {
            const div = document.createElement('div'); div.className = item.type === 'folder' ? 'item-card type-folder' : 'item-card';
            div.onclick = () => item.type === 'folder' ? openFolderView(item.id) : window.open(item.url, '_blank');
            div.oncontextmenu = (e) => showContextMenu(e, item.type, item.id);
            attachDragEvents(div, item, null);
            if(item.type === 'folder') div.innerHTML = `<div class="icon-box">${item.emoji || '📂'}</div><span class="item-title">${item.name}</span>`;
            else { const iconSrc = item.customIcon || getFaviconUrl(item.url); div.innerHTML = `<div class="icon-box"><img src="${iconSrc}" class="favicon-img" onerror="this.style.display='none';"><i data-lucide="globe" style="display:none; width:28px;"></i></div><span class="item-title">${item.title}</span>`; }
            grid.appendChild(div);
        });
    }
}

function attachDragEvents(div, item, parentId) {
    div.draggable = true;
    div.ondragstart = (e) => {
        dragState = { id: item.id, parentId: parentId, type: item.type || 'link' };
        e.dataTransfer.setData('text/plain', JSON.stringify(dragState)); div.classList.add('dragging');
    };
    div.ondragend = () => { div.classList.remove('dragging'); document.querySelectorAll('.item-card').forEach(c => c.classList.remove('drag-over', 'drag-insert')); };
    div.ondragover = (e) => {
        e.preventDefault(); if (dragState.id === item.id) return;
        if (!dragState.parentId && dragState.type === 'link' && item.type === 'folder') div.classList.add('drag-over'); 
        else div.classList.add('drag-insert'); 
    };
    div.ondragleave = () => div.classList.remove('drag-over', 'drag-insert');
    div.ondrop = (e) => {
        e.preventDefault(); div.classList.remove('drag-over', 'drag-insert');
        handleDropLogic(dragState.id, dragState.parentId, item.id, parentId);
    };
}

function handleDropLogic(sourceId, sourceParentId, targetId, targetParentId) {
    if (!sourceId || sourceId === targetId) return;
    const activeTab = appData.tabs.find(t => t.id === appData.activeTabId);
    let sourceArray = sourceParentId ? activeTab.items.find(i => i.id === sourceParentId).links : activeTab.items;
    let targetArray = targetParentId ? activeTab.items.find(i => i.id === targetParentId).links : activeTab.items;

    const sourceIndex = sourceArray.findIndex(i => i.id === sourceId);
    if(sourceIndex === -1) return;
    const targetItem = targetArray.find(i => i.id === targetId);

    if (!sourceParentId && !targetParentId && sourceArray[sourceIndex].type === 'link' && targetItem && targetItem.type === 'folder') {
        const [movedItem] = sourceArray.splice(sourceIndex, 1); targetItem.links.push(movedItem); showToast("폴더로 이동되었습니다.");
    } else {
        const [movedItem] = sourceArray.splice(sourceIndex, 1);
        const freshTargetIndex = targetArray.findIndex(i => i.id === targetId);
        targetArray.splice(freshTargetIndex !== -1 ? freshTargetIndex : targetArray.length, 0, movedItem);
    }
    saveData(); renderMainGrid(); lucide.createIcons();
}

document.addEventListener('dragover', (e) => { e.preventDefault(); });
document.addEventListener('drop', (e) => {
    try { if (e.dataTransfer.getData('text/plain').includes('linkId')) return; } catch(err) {}
    const url = e.dataTransfer.getData('URL') || e.dataTransfer.getData('text/uri-list');
    if (url && (url.startsWith('http') || url.startsWith('chrome'))) {
        e.preventDefault(); let title = url; try { title = new URL(url).hostname || url; } catch(err) {}
        const newLink = { type: 'link', id: 'l' + Date.now(), title, url };
        const activeTab = appData.tabs.find(t => t.id === appData.activeTabId);
        if (currentOpenFolderId) activeTab.items.find(i => i.id === currentOpenFolderId).links.push(newLink); else activeTab.items.push(newLink);
        saveData(); renderMainGrid(); lucide.createIcons(); showToast("북마크가 추가되었습니다.");
        setTimeout(() => { const n = prompt("새 북마크 이름 수정:", title); if (n) { newLink.title = n; saveData(); renderMainGrid(); } }, 100);
    }
});

/* -----------------------------------------
 * 5. 기타 UI 로직 (탭, 우클릭, 모달)
 * ----------------------------------------- */
function renderTabs() {
    const nav = document.getElementById('tabsNav'); nav.innerHTML = '';
    appData.tabs.forEach(tab => {
        const btn = document.createElement('button'); btn.className = `tab-btn ${appData.activeTabId === tab.id ? 'active' : ''}`; btn.textContent = tab.name;
        btn.onclick = () => { appData.activeTabId = tab.id; currentOpenFolderId = null; saveData(); renderAll(); }; btn.oncontextmenu = (e) => showContextMenu(e, 'tab', tab.id); nav.appendChild(btn);
    });
    const addBtn = document.createElement('button'); addBtn.className = 'btn-add-icon'; addBtn.innerHTML = '<i data-lucide="plus"></i>';
    addBtn.onclick = () => { const n = prompt("새 탭 이름:"); if(n) { appData.tabs.push({ id: 't' + Date.now(), name:n, items: [] }); appData.activeTabId = appData.tabs[appData.tabs.length-1].id; saveData(); renderAll(); } }; nav.appendChild(addBtn);
}

document.addEventListener('click', () => { document.getElementById('contextMenu').style.display = 'none'; });
function showContextMenu(e, type, id, parentId = null) {
    e.preventDefault(); contextTarget = { type, id, parentId };
    const menu = document.getElementById('contextMenu'); menu.innerHTML = '';
    if(type === 'tab') { menu.innerHTML += `<div class="context-menu-item" onclick="renameItem()"><i data-lucide="edit-2"></i> 이름 변경</div><div class="context-menu-item danger" onclick="deleteItem()"><i data-lucide="trash-2"></i> 삭제</div>`; } 
    else if (type === 'folder') { menu.innerHTML += `<div class="context-menu-item" onclick="renameItem()"><i data-lucide="edit-2"></i> 이름 변경</div><div class="context-menu-item" onclick="changeEmoji()"><i data-lucide="smile"></i> 이모지 변경</div><div class="context-menu-item danger" onclick="deleteItem()"><i data-lucide="trash-2"></i> 삭제</div>`; } 
    else if (type === 'link') { menu.innerHTML += `<div class="context-menu-item" onclick="renameItem()"><i data-lucide="edit-2"></i> 이름 변경</div><div class="context-menu-item" onclick="changeLinkIcon()"><i data-lucide="image"></i> 아이콘 변경</div><div class="context-menu-item danger" onclick="deleteItem()"><i data-lucide="trash-2"></i> 삭제</div>`; }
    menu.style.display = 'block'; menu.style.left = `${Math.min(e.pageX, window.innerWidth - 160)}px`; menu.style.top = `${Math.min(e.pageY, window.innerHeight - 100)}px`; lucide.createIcons();
}

function renameItem() {
    const { type, id, parentId } = contextTarget; const activeTab = appData.tabs.find(t => t.id === appData.activeTabId);
    if(type === 'tab') { const tab = appData.tabs.find(t => t.id === id); const n = prompt("새 이름:", tab.name); if(n) tab.name = n; }
    else if(type === 'folder' || (type === 'link' && !parentId)) { const item = activeTab.items.find(i => i.id === id); const n = prompt("새 이름:", item.name || item.title); if(n) item.name ? item.name = n : item.title = n; }
    else if (type === 'link' && parentId) { const folder = activeTab.items.find(i => i.id === parentId); const link = folder.links.find(l => l.id === id); const n = prompt("새 이름:", link.title); if(n) link.title = n; }
    saveData(); renderAll(); 
}
function changeEmoji() { const activeTab = appData.tabs.find(t => t.id === appData.activeTabId); const folder = activeTab.items.find(i => i.id === contextTarget.id); const newEmoji = prompt("이모지 입력:", folder.emoji || '📂'); if(newEmoji) { folder.emoji = newEmoji; saveData(); renderAll(); } }
function changeLinkIcon() { const { id, parentId } = contextTarget; const activeTab = appData.tabs.find(t => t.id === appData.activeTabId); let link = parentId ? activeTab.items.find(i => i.id === parentId).links.find(l => l.id === id) : activeTab.items.find(i => i.id === id); const newIconUrl = prompt("이미지 URL 입력:", link.customIcon || ""); if (newIconUrl !== null) { link.customIcon = newIconUrl.trim(); saveData(); renderAll(); } }
function deleteItem() { if(!confirm("정말 삭제하시겠습니까?")) return; const { type, id, parentId } = contextTarget; if(type === 'tab') { appData.tabs = appData.tabs.filter(t => t.id !== id); if(appData.activeTabId === id) appData.activeTabId = appData.tabs.length > 0 ? appData.tabs[0].id : null; } else if(type === 'folder' || (type === 'link' && !parentId)) { const activeTab = appData.tabs.find(t => t.id === appData.activeTabId); activeTab.items = activeTab.items.filter(i => i.id !== id); } else if (type === 'link' && parentId) { const activeTab = appData.tabs.find(t => t.id === appData.activeTabId); const folder = activeTab.items.find(i => i.id === parentId); folder.links = folder.links.filter(l => l.id !== id); } saveData(); renderAll(); showToast("삭제 완료"); }

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex'; 
    if(modalId === 'bgModal' && document.getElementById('presetBgGrid').innerHTML === '') loadNextBgPage(); 
    if(modalId === 'cityModal') renderDynamicCityRows();
    setTimeout(() => { if(modalId === 'folderModal') document.getElementById('folderNameInput').focus(); if(modalId === 'bookmarkModal') document.getElementById('bmTitleInput').focus(); }, 100);
}
function closeModal(modalId) { document.getElementById(modalId).style.display = 'none'; if(modalId === 'folderModal') document.getElementById('folderNameInput').value = ''; if(modalId === 'bookmarkModal') { document.getElementById('bmTitleInput').value = ''; document.getElementById('bmUrlInput').value = 'https://'; } }
function createFolder() { const name = document.getElementById('folderNameInput').value.trim(); if(!name) return; appData.tabs.find(t => t.id === appData.activeTabId).items.push({ type: 'folder', id: 'f' + Date.now(), name, emoji: '📂', links: [] }); saveData(); renderMainGrid(); closeModal('folderModal'); lucide.createIcons(); showToast("폴더 생성 완료"); }
function createBookmark() { const title = document.getElementById('bmTitleInput').value.trim(); const url = document.getElementById('bmUrlInput').value.trim(); if(!title || !url || url === 'https://') return; const newLink = { type: 'link', id: 'l' + Date.now(), title, url }; const activeTab = appData.tabs.find(t => t.id === appData.activeTabId); if(currentOpenFolderId) activeTab.items.find(i => i.id === currentOpenFolderId).links.push(newLink); else activeTab.items.push(newLink); saveData(); renderMainGrid(); closeModal('bookmarkModal'); lucide.createIcons(); showToast("북마크 저장 완료"); }

// 할일 로직
function renderTodos() { const list = document.getElementById('todoList'); list.innerHTML = ''; appData.todos.forEach(todo => { const div = document.createElement('div'); div.className = `todo-item ${todo.done ? 'done' : ''}`; div.innerHTML = `<input type="checkbox" ${todo.done ? 'checked' : ''} onchange="toggleTodo('${todo.id}')"><span>${todo.text}</span><button class="btn-del" onclick="deleteTodo('${todo.id}')"><i data-lucide="trash-2"></i></button>`; list.appendChild(div); }); }
function addTodo() { const input = document.getElementById('todoInput'); const text = input.value.trim(); if(!text) return; appData.todos.push({ id: 'td' + Date.now(), text, done: false }); input.value = ''; saveData(); renderTodos(); lucide.createIcons(); }
function toggleTodo(id) { const todo = appData.todos.find(t => t.id === id); if(todo) { todo.done = !todo.done; saveData(); renderTodos(); lucide.createIcons(); } }
function deleteTodo(id) { appData.todos = appData.todos.filter(t => t.id !== id); saveData(); renderTodos(); lucide.createIcons(); }

/* -----------------------------------------
 * 6. 최대 10개 동적 시계 생성 로직
 * ----------------------------------------- */
function updateClocks() {
    const now = new Date(); const container = document.getElementById('clocksContainer'); container.innerHTML = '';
    appData.selectedCities.forEach((cityId, index) => {
        const city = CITIES.find(c => c.id === cityId); if(!city) return;
        const timeStr = now.toLocaleTimeString('en-US', { timeZone: city.tz, hour: '2-digit', minute: '2-digit', hour12: false });
        const diffHours = Math.round((new Date(now.toLocaleString('en-US', {timeZone: city.tz})) - new Date(now.toLocaleString('en-US'))) / 3600000);
        const wInfo = weatherDataCache[city.id] ? `${weatherDataCache[city.id].emoji} ${weatherDataCache[city.id].temp}°C` : '--°C';
        if(index === 0) container.innerHTML += `<div class="main-clock"><div><h1 class="main-clock-time">${timeStr}</h1><p style="font-size: 0.85rem; color: var(--text-sub);">${city.name.split(' ')[0]}</p></div><div style="text-align: right;"><div style="font-size: 1.4rem; font-weight: 600;">${wInfo}</div><div style="font-size: 0.8rem; color: var(--text-sub); margin-top: 0.2rem;">${now.toLocaleDateString('ko-KR', {timeZone: city.tz, month: 'short', day: 'numeric', weekday:'short'})}</div></div></div>`;
        else container.innerHTML += `<div class="sub-clock"><div><span class="sub-clock-time">${timeStr}</span><span style="font-size: 0.8rem; color: var(--text-sub); margin-left: 0.5rem;">${city.name.split(' ')[0]}</span></div><div style="text-align: right; font-size: 0.85rem;"><span style="color: var(--accent); margin-right: 0.5rem; font-weight:600;">${diffHours === 0 ? '시차 없음' : (diffHours>0?'+'+diffHours:diffHours)+'H'}</span><span>${wInfo}</span></div></div>`;
    });
}
async function fetchWeathers() {
    for(let cityId of appData.selectedCities) {
        const city = CITIES.find(c => c.id === cityId); if(!city) continue;
        try { const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true`); const data = await res.json(); const code = data.current_weather.weathercode; let emoji = '☁️'; if(code === 0) emoji = '☀️'; else if(code <= 3) emoji = '⛅'; else if(code <= 67) emoji = '🌧️'; else if(code <= 77) emoji = '❄️'; else emoji = '⚡'; weatherDataCache[city.id] = { temp: Math.round(data.current_weather.temperature), emoji }; } catch(e) {}
    } updateClocks();
}

function renderDynamicCityRows() {
    const container = document.getElementById('dynamicCityContainer'); container.innerHTML = '';
    appData.selectedCities.forEach((cityId, index) => addCityRowHTML(container, cityId, index));
    checkCityLimit(); lucide.createIcons();
}

function addCityRowHTML(container, selectedId, index) {
    const row = document.createElement('div'); row.style.display = 'flex'; row.style.gap = '0.5rem'; row.style.alignItems = 'center';
    const select = document.createElement('select'); select.className = 'form-select city-dropdown';
    
    CITIES.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id; 
        opt.textContent = c.name; 
        if(c.id === selectedId) opt.selected = true; 
        select.appendChild(opt);
    });
    
    row.appendChild(select);
    if (index !== 0) { 
        const delBtn = document.createElement('button'); delBtn.className = 'action-btn'; delBtn.style.padding = '0.6rem'; delBtn.innerHTML = '<i data-lucide="minus"></i>'; 
        delBtn.onclick = () => { row.remove(); checkCityLimit(); }; 
        row.appendChild(delBtn); 
    }
    container.appendChild(row);
}

function addCitySelectRow() {
    const container = document.getElementById('dynamicCityContainer');
    if(container.children.length < 10) { addCityRowHTML(container, 'ny', container.children.length); checkCityLimit(); lucide.createIcons(); }
}
function checkCityLimit() {
    const count = document.getElementById('dynamicCityContainer').children.length;
    document.getElementById('btnAddCity').style.display = count >= 10 ? 'none' : 'flex';
}
function saveCities() {
    const selects = document.querySelectorAll('.city-dropdown');
    appData.selectedCities = Array.from(selects).map(s => s.value);
    saveData(); updateClocks(); fetchWeathers(); closeModal('cityModal'); showToast("시간대 적용 완료");
}

setInterval(updateClocks, 1000); updateClocks(); fetchWeathers();
renderAll();