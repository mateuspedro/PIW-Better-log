// ==UserScript==
// @name         PIW — Botão Log de Capturas na sidebar
// @namespace    http://tampermonkey.net/
// @version      1.3.0
// @description  Adiciona o botão 📜 na sidebar do PIW-QOL que abre o Log de Capturas com filtros, ordenação, ícones e botão de limpar histórico. Auto-refresh a cada 40s quando a aba está visível. Exibe todos os resultados sem paginação.
// @author       KizaniN
// @match        https://poke.idleworld.online/play*
// @grant        none
// @run-at       document-start
// @homepageURL  https://github.com/mateuspedro/PIW-Better-log
// @supportURL   https://github.com/mateuspedro/PIW-Better-log/issues
// @updateURL    https://raw.githubusercontent.com/mateuspedro/PIW-Better-log/main/better-log.user.js
// @downloadURL  https://raw.githubusercontent.com/mateuspedro/PIW-Better-log/main/better-log.user.js
// ==/UserScript==

(function() {
    'use strict';

    const AUTO_REFRESH_MS = 40000;

    function getPokemonQualityInfo(multiplier) {
        const value = Number(multiplier);
        if (!Number.isFinite(value)) return null;
        if (value < 1.0) return { label: 'Fraca', color: '#9e9e9e' };
        if (value < 1.1) return { label: 'Comum', color: '#a8a8a8' };
        if (value < 1.3) return { label: 'Incomum', color: '#5ed7b9' };
        if (value < 1.5) return { label: 'Rara', color: '#69b7ff' };
        if (value < 1.7) return { label: 'Épica', color: '#d985ff' };
        if (value < 2.0) return { label: 'Lendária', color: '#f1c644' };
        if (value < 3.0) return { label: 'Mítica', color: '#ff6680' };
        if (value < 4.0) return { label: 'Anciã', color: '#ff9800' };
        return { label: 'Divina', color: '#00bcd4' };
    }
    function formatPokemonQuality(multiplier) {
        const info = getPokemonQualityInfo(multiplier);
        const value = Number(multiplier);
        return info ? `${info.label} ×${value.toFixed(2)}` : null;
    }
    function escapeHTML(v) {
        return String(v ?? '').replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
        })[c]);
    }
    function getGameTokens() {
        try { return JSON.parse(sessionStorage.getItem('pokeweb:tokens') || 'null'); } catch { return null; }
    }
    async function refreshGameAccessToken() {
        const tokens = getGameTokens();
        if (!tokens?.refreshToken) return null;
        const response = await fetch('/api/auth/refresh', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: tokens.refreshToken })
        });
        if (!response.ok) return null;
        const refreshed = await response.json();
        if (!refreshed?.accessToken) return null;
        sessionStorage.setItem('pokeweb:tokens', JSON.stringify(refreshed));
        return refreshed.accessToken;
    }
    async function gameApiRequest(url, options = {}) {
        const send = accessToken => fetch(url, {
            ...options,
            headers: {
                ...(options.body ? { 'Content-Type': 'application/json' } : {}),
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                ...(options.headers || {})
            }
        });
        let response = await send(getGameTokens()?.accessToken);
        if (response.status === 401) {
            const refreshedToken = await refreshGameAccessToken();
            if (refreshedToken) response = await send(refreshedToken);
        }
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result?.message || `HTTP ${response.status}`);
        return result;
    }

    // CSS do log de capturas (janela arrastável)
    (function injectCaptureLogStyles() {
        if (document.getElementById('script-capture-log-styles')) return;
        const css = document.createElement('style');
        css.id = 'script-capture-log-styles';
        css.textContent = `
            .script-capture-log-backdrop {
                background: transparent !important;
                backdrop-filter: none !important;
            }
            .script-custom-capture-log .script-cl-tab.on {
                background: linear-gradient(rgb(230, 205, 142), rgb(200, 162, 78)) !important;
                color: rgb(26, 18, 6) !important;
                border-color: rgb(106, 82, 35) !important;
            }
            .script-custom-capture-log .script-cl-list > div:hover {
                background: rgba(200, 170, 110, .08) !important;
                border-color: rgba(200, 170, 110, .24) !important;
            }
            .script-capture-log-titlebar:active {
                cursor: grabbing !important;
            }
        `;
        (document.head || document.documentElement).appendChild(css);
    })();

    const POKEMON_ITEM_ICONS = {
        1:36575,2:36585,3:36595,4:36605,5:36615,6:36625,7:36634,8:36643,9:36651,10:36669,
        11:36660,12:36702,13:36696,14:36687,15:36705,16:36722,17:36713,18:36731,19:36740,20:36755,
        21:36758,22:36767,23:36776,24:36785,25:36639,26:36647,27:36601,28:36611,29:36586,30:36606,
        31:36596,32:36576,33:36626,34:36616,35:36644,36:36635,37:36674,38:36683,39:36620,40:36630,
        41:36580,42:36590,43:36717,44:36726,45:36735,46:36652,47:36661,48:36670,49:36900,50:36688,
        51:36697,52:36723,53:36714,54:36656,55:36665,56:36706,57:36759,58:36782,59:36741,60:36732,
        61:36768,62:36786,63:36691,64:36700,65:36709,66:36771,67:36780,68:36789,69:36777,70:36577,
        71:36587,72:36676,73:36685,74:36744,75:36753,76:36762,77:36597,78:36607,79:36617,80:36627,
        81:36631,82:36640,83:36636,84:36692,85:36701,86:36799,87:36653,88:36655,89:36641,90:36671,
        91:36662,92:36680,93:36689,94:36698,95:36707,96:36715,97:36724,98:36592,99:36733,100:36694,
        101:36703,102:36751,103:36760,104:36769,105:36778,106:36737,107:36648,108:36588,109:36673,110:36682,
        111:36710,112:36718,113:36598,114:36608,115:36618,116:36781,117:36738,118:36745,119:36754,120:36581,
        121:36591,122:36628,123:36637,124:36645,125:36622,126:36663,127:36621,128:36672,129:36711,130:36720,
        131:36681,132:36690,133:36699,134:36708,135:36716,136:36725,137:36734,138:36743,139:36752,140:36761,
        141:36770,142:36779,143:36788,147:36629,148:36638,149:36646,150:36609
    };

    function getPokemonIconUrl(speciesId) {
        const id = Number(speciesId);
        if (!Number.isFinite(id)) return '';
        if (id >= 152 && id <= 251 && id !== 201) return `/assets/pokeitems/gen2/${id}.png`;
        if ((id >= 252 && id <= 386) || id === 447 || id === 448) return `/assets/pokeitems/gen3/${id}.png`;
        return POKEMON_ITEM_ICONS[id] ? `/assets/pokeitems/${POKEMON_ITEM_ICONS[id]}.png` : '';
    }

    let activeCaptureLogRefreshTimer = null;

    function stopCaptureLogAutoRefresh() {
        if (activeCaptureLogRefreshTimer !== null) {
            clearInterval(activeCaptureLogRefreshTimer);
            activeCaptureLogRefreshTimer = null;
        }
    }

    function showCustomCaptureLog() {
        document.querySelector('.script-capture-log-backdrop')?.remove();
        stopCaptureLogAutoRefresh();

        const state = {
            tab: 'all', sort: 'recent', search: '',
            ivMin: '', ivMax: '',
            allRows: [], loading: false
        };
        const STORAGE_POS = 'script_capture_log_pos_v1';
        let savedPos = null;
        try { savedPos = JSON.parse(localStorage.getItem(STORAGE_POS) || 'null'); } catch {}
        const initialStyle = savedPos && Number.isFinite(savedPos.left) && Number.isFinite(savedPos.top)
            ? `position:fixed;left:${savedPos.left}px;top:${savedPos.top}px;`
            : 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);';

        const backdrop = document.createElement('div');
        backdrop.className = 'script-capture-log-backdrop';
        backdrop.style.cssText = 'position:fixed;inset:0;background:transparent;pointer-events:none;z-index:10150;';
        backdrop.innerHTML = `
            <div class="script-custom-capture-log" style="${initialStyle}width:min(560px,94vw);max-height:70vh;display:flex;flex-direction:column;background:linear-gradient(rgba(16,24,35,.99),rgba(9,14,21,.99));color:rgb(233,226,208);border:2px solid rgb(120,90,40);border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.7);font-family:Barlow,sans-serif;pointer-events:auto;">
                <div class="script-capture-log-titlebar" style="min-height:40px;box-sizing:border-box;padding:10px 12px 6px;border-bottom:1px solid rgba(200,170,110,.16);color:rgb(240,230,210);font-size:15px;font-weight:700;display:flex;align-items:center;gap:8px;cursor:grab;user-select:none;">
                    <span>📜 Log de Capturas</span>
                    <span class="script-capture-log-totals" style="margin-left:8px;font-size:11px;color:#a0aec0;font-weight:400;"></span>
                    <button class="script-capture-log-refresh mk-bulk-btn" type="button" style="margin-left:auto;font-size:11px;padding:2px 6px;cursor:pointer;">↻</button>
                    <button class="script-capture-log-close" type="button" aria-label="Fechar" style="background:none;border:0;color:#a0aec0;font-size:20px;cursor:pointer;margin-left:4px;padding:0 4px;">×</button>
                </div>
                <div style="padding:10px 12px;display:flex;flex-direction:column;gap:8px;overflow:hidden;flex:1;min-height:0;">
                    <div style="display:flex;gap:5px;">
                        <button class="mk-bulk-btn script-cl-tab on" data-tab="all" type="button">Todos</button>
                        <button class="mk-bulk-btn script-cl-tab" data-tab="shiny" type="button">✨ Shiny</button>
                        <button class="mk-bulk-btn script-cl-tab" data-tab="normal" type="button">Normais</button>
                    </div>
                    <div style="display:grid;grid-template-columns:1.4fr repeat(2,minmax(70px,0.7fr)) 1fr;gap:5px;background:#101d27;border:1px solid #203544;border-radius:7px;padding:6px;">
                        <input class="script-cl-search" type="search" placeholder="Buscar Pokémon..." style="background:#0c161f;color:#e2e8f0;border:1px solid #273f52;border-radius:5px;padding:5px 7px;font-size:12px;">
                        <input class="script-cl-iv-min" type="number" min="0" max="192" placeholder="IV mín." style="background:#0c161f;color:#e2e8f0;border:1px solid #273f52;border-radius:5px;padding:5px 7px;font-size:12px;">
                        <input class="script-cl-iv-max" type="number" min="0" max="192" placeholder="IV máx." style="background:#0c161f;color:#e2e8f0;border:1px solid #273f52;border-radius:5px;padding:5px 7px;font-size:12px;">
                        <select class="script-cl-sort" style="background:#0c161f;color:#e2e8f0;border:1px solid #273f52;border-radius:5px;padding:5px 7px;font-size:12px;">
                            <option value="recent">Mais recentes</option>
                            <option value="oldest">Mais antigos</option>
                            <option value="quality-desc">Qualidade ↓</option>
                            <option value="quality-asc">Qualidade ↑</option>
                            <option value="iv-desc">IV ↓</option>
                            <option value="iv-asc">IV ↑</option>
                            <option value="name">Nome (A–Z)</option>
                        </select>
                    </div>
                    <div class="script-cl-status" style="color:#a0aec0;font-size:11px;padding:0 2px;">Carregando…</div>
                    <div class="script-cl-list" style="flex:1;overflow:auto;display:grid;gap:5px;padding:1px;min-height:0;"></div>
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding-top:4px;border-top:1px solid #1a2d3a;">
                        <button class="script-cl-clear mk-bulk-btn" type="button" style="margin-left:auto;font-size:11px;padding:3px 10px;color:#feb2b2;border-color:#71313c;">🗑 Limpar histórico</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(backdrop);

        const modal = backdrop.querySelector('.script-custom-capture-log');
        const titleBar = backdrop.querySelector('.script-capture-log-titlebar');
        const listEl = backdrop.querySelector('.script-cl-list');
        const statusEl = backdrop.querySelector('.script-cl-status');
        const totalsEl = backdrop.querySelector('.script-capture-log-totals');
        const searchEl = backdrop.querySelector('.script-cl-search');
        const ivMinEl = backdrop.querySelector('.script-cl-iv-min');
        const ivMaxEl = backdrop.querySelector('.script-cl-iv-max');
        const sortEl = backdrop.querySelector('.script-cl-sort');

        const close = () => {
            stopCaptureLogAutoRefresh();
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            backdrop.remove();
        };
        backdrop.querySelector('.script-capture-log-close').addEventListener('click', close);

        // Arrastar pelo título
        let isDragging = false;
        let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;
        function onPointerDown(e) {
            if (e.target.closest('button, input, select')) return;
            const rect = modal.getBoundingClientRect();
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = rect.left;
            initialTop = rect.top;
            modal.style.setProperty('left', `${rect.left}px`, 'important');
            modal.style.setProperty('top', `${rect.top}px`, 'important');
            modal.style.transform = 'none';
            titleBar.setPointerCapture?.(e.pointerId);
            e.preventDefault();
        }
        function onPointerMove(e) {
            if (!isDragging) return;
            const maxLeft = Math.max(0, window.innerWidth - modal.offsetWidth);
            const maxTop = Math.max(0, window.innerHeight - modal.offsetHeight);
            modal.style.setProperty('left', `${Math.min(maxLeft, Math.max(0, initialLeft + e.clientX - startX))}px`, 'important');
            modal.style.setProperty('top', `${Math.min(maxTop, Math.max(0, initialTop + e.clientY - startY))}px`, 'important');
        }
        function onPointerUp() {
            if (isDragging) {
                const rect = modal.getBoundingClientRect();
                try {
                    localStorage.setItem(STORAGE_POS, JSON.stringify({ left: rect.left, top: rect.top }));
                } catch {}
            }
            isDragging = false;
        }
        titleBar.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);

        const fmtDate = iso => {
            const d = new Date(iso);
            const pad = n => String(n).padStart(2, '0');
            return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };
        const fmtNum = n => Number(n || 0).toLocaleString('pt-BR');
        const applyLocalFilters = rows => rows.filter(r => {
            if (state.tab === 'shiny' && !r.shiny) return false;
            if (state.tab === 'normal' && r.shiny) return false;
            const q = state.search.trim().toLowerCase();
            if (q && !String(r.name || '').toLowerCase().includes(q)) return false;
            const iv = Number(r.ivTotal ?? 0);
            if (state.ivMin !== '' && iv < Number(state.ivMin)) return false;
            if (state.ivMax !== '' && iv > Number(state.ivMax)) return false;
            return true;
        });
               const compareByMode = (a, b) => {
            switch (state.sort) {
                case 'recent': return new Date(b.at) - new Date(a.at);
                case 'oldest': return new Date(a.at) - new Date(b.at);
                case 'quality-desc': return Number(b.quality || 0) - Number(a.quality || 0);
                case 'quality-asc': return Number(a.quality || 0) - Number(b.quality || 0);
                case 'iv-desc': return Number(b.ivTotal || 0) - Number(a.ivTotal || 0);
                case 'iv-asc': return Number(a.ivTotal || 0) - Number(b.ivTotal || 0);
                case 'name': return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
                default: return 0;
            }
        };
        const sortRows = rows => {
            const shinies = rows.filter(r => r.shiny).sort(compareByMode);
            const normals = rows.filter(r => !r.shiny).sort(compareByMode);
            return [...shinies, ...normals];
        };
        const buildRow = r => {
            const qualityInfo = getPokemonQualityInfo(Number(r.quality));
            const ivTotal = Number(r.ivTotal ?? 0);
            const qualityColor = qualityInfo?.color || '#a0aec0';
            const qualityLabel = qualityInfo ? `${qualityInfo.label} ×${Number(r.quality).toFixed(2)}` : `×${Number(r.quality).toFixed(2)}`;
            const shinyTag = r.shiny ? '<span style="color:#f6e05e;font-weight:800;">✨</span> ' : '';
            const iconUrl = getPokemonIconUrl(r.speciesId) || '';
            const iconHTML = iconUrl
                ? `<img src="${escapeHTML(iconUrl)}" alt="" style="width:30px;height:30px;object-fit:contain;image-rendering:pixelated;" onerror="this.style.display='none'">`
                : `<span style="display:inline-block;width:30px;height:30px;border-radius:50%;border:1px solid #1a1a1a;background:linear-gradient(to bottom,#e53e3e 0%,#e53e3e 46%,#1a1a1a 46%,#1a1a1a 54%,#f7fafc 54%,#f7fafc 100%);"></span>`;
            const row = document.createElement('div');
            row.style.cssText = 'display:grid;grid-template-columns:34px minmax(120px,1.4fr) minmax(100px,1fr) minmax(70px,0.7fr) minmax(70px,0.7fr);gap:8px;align-items:center;background:#14222d;border:1px solid #1f3545;border-radius:7px;padding:6px 8px;color:#e2e8f0;font-size:12px;';
            row.innerHTML = `
                <span style="width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;">${iconHTML}</span>
                <span style="min-width:0;">
                    <b style="display:block;color:#fff;font-size:12px;">${shinyTag}${escapeHTML(r.name || '—')}</b>
                    <small style="color:#a0aec0;font-size:10px;">${escapeHTML(fmtDate(r.at))} · ${escapeHTML(r.ballName || '—')}</small>
                </span>
                <span><b style="color:${qualityColor};font-weight:800;font-size:11px;">${escapeHTML(qualityLabel)}</b></span>
                <span style="color:#cbd5e0;font-size:11px;">IV <b>${ivTotal}</b>/192</span>
                <span style="color:#cbd5e0;font-size:11px;">Nv <b>${Number(r.level ?? 0)}</b></span>
            `;
            return row;
        };
        const render = () => {
            const filtered = sortRows(applyLocalFilters(state.allRows));
            totalsEl.textContent = `${fmtNum(filtered.length)} de ${fmtNum(state.allRows.length)}`;
            statusEl.textContent = state.allRows.length === 0 ? 'Nenhuma captura registrada.' : `${fmtNum(filtered.length)} exibida(s).`;
            listEl.innerHTML = '';
            if (filtered.length === 0) {
                listEl.innerHTML = '<div style="color:#718096;text-align:center;padding:18px;">Nenhuma captura corresponde aos filtros.</div>';
            } else {
                filtered.forEach(r => listEl.appendChild(buildRow(r)));
            }
        };
        const load = async ({ silent = false } = {}) => {
            if (state.loading) return;
            state.loading = true;
            if (!silent) {
                statusEl.style.color = '#a0aec0';
                statusEl.textContent = 'Carregando…';
            }
            try {
                const payload = await gameApiRequest('/api/game/capture-log?filter=all');
                state.allRows = Array.isArray(payload?.rows) ? payload.rows : [];
                render();
            } catch (error) {
                if (!silent) {
                    statusEl.textContent = `Não foi possível carregar o log: ${error.message}`;
                    statusEl.style.color = '#feb2b2';
                }
            } finally { state.loading = false; }
        };
        backdrop.querySelector('.script-capture-log-refresh').addEventListener('click', () => load());
        backdrop.querySelectorAll('.script-cl-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                state.tab = tab.dataset.tab;
                backdrop.querySelectorAll('.script-cl-tab').forEach(t => t.classList.toggle('on', t === tab));
                render();
            });
        });
        const bindInput = (el, key) => el.addEventListener('input', () => { state[key] = el.value; render(); });
        bindInput(searchEl, 'search');
        bindInput(ivMinEl, 'ivMin');
        bindInput(ivMaxEl, 'ivMax');
        sortEl.addEventListener('change', () => { state.sort = sortEl.value; render(); });

        // ===== Auto-refresh a cada 40s (só com a aba visível) =====
        function startAutoRefresh() {
            stopCaptureLogAutoRefresh();
            activeCaptureLogRefreshTimer = setInterval(() => {
                if (document.hidden) return;
                if (!document.body.contains(backdrop)) {
                    stopCaptureLogAutoRefresh();
                    return;
                }
                load({ silent: true });
            }, AUTO_REFRESH_MS);
        }
        function onVisibilityChange() {
            if (document.hidden) {
                stopCaptureLogAutoRefresh();
            } else if (document.body.contains(backdrop)) {
                startAutoRefresh();
                load({ silent: true });
            }
        }
        document.addEventListener('visibilitychange', onVisibilityChange);
        startAutoRefresh();

        // ===== Limpar histórico =====
        backdrop.querySelector('.script-cl-clear').addEventListener('click', async () => {
            const confirmed = await new Promise(resolve => {
                const confirmBackdrop = document.createElement('div');
                confirmBackdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:10200;display:flex;align-items:center;justify-content:center;';
                confirmBackdrop.innerHTML = `
                    <div style="width:min(360px,92vw);background:linear-gradient(rgba(16,24,35,.99),rgba(9,14,21,.99));color:rgb(233,226,208);border:2px solid rgb(120,90,40);border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.7);font-family:Barlow,sans-serif;overflow:hidden;">
                        <div style="min-height:44px;padding:11px 14px 7px;border-bottom:1px solid rgba(200,170,110,.16);font-weight:700;font-size:15px;display:flex;align-items:center;gap:8px;">⚠️ Limpar histórico</div>
                        <div style="padding:14px;">
                            <p style="margin:0 0 14px;color:#cbd5e0;font-size:13px;line-height:1.4;">Apagar <b>todo</b> o histórico de capturas? Esta ação é permanente e não pode ser desfeita.</p>
                            <div style="display:flex;gap:8px;">
                                <button class="cfg-clear-yes" type="button" style="flex:1;padding:8px;border:1px solid #9b2c2c;border-radius:6px;background:#742a2a;color:#fff;font-weight:700;font-size:13px;cursor:pointer;">Apagar tudo</button>
                                <button class="cfg-clear-no" type="button" style="flex:1;padding:8px;border:1px solid #273f52;border-radius:6px;background:#2b4c66;color:#e2e8f0;font-weight:700;font-size:13px;cursor:pointer;">Cancelar</button>
                            </div>
                        </div>
                    </div>`;
                document.body.appendChild(confirmBackdrop);
                const finish = value => { confirmBackdrop.remove(); resolve(value); };
                confirmBackdrop.querySelector('.cfg-clear-yes').addEventListener('click', () => finish(true));
                confirmBackdrop.querySelector('.cfg-clear-no').addEventListener('click', () => finish(false));
            });
            if (!confirmed) return;

            const clearButton = backdrop.querySelector('.script-cl-clear');
            clearButton.disabled = true;
            clearButton.textContent = 'Apagando…';
            try {
                await gameApiRequest('/api/game/capture-log/clear', { method: 'POST' });
                state.allRows = [];
                statusEl.style.color = '#48bb78';
                statusEl.textContent = 'Histórico apagado.';
                render();
                clearButton.textContent = '🗑 Limpar histórico';
            } catch (error) {
                statusEl.style.color = '#feb2b2';
                statusEl.textContent = `Não foi possível limpar: ${error.message}`;
                clearButton.textContent = '🗑 Limpar histórico';
            } finally {
                clearButton.disabled = false;
            }
        });

        load();
    }

    function injectCaptureLogButton() {
        const sidebar = document.getElementById('script-sidebar');
        if (!sidebar || sidebar.querySelector('#dock-btn-capturelog')) return;
        const btn = document.createElement('button');
        btn.id = 'dock-btn-capturelog';
        btn.className = 'dock-btn';
        btn.type = 'button';
        btn.title = 'Log de Capturas';
        btn.setAttribute('aria-label', 'Abrir Log de Capturas');
        btn.textContent = '📜';
        btn.style.cssText = 'background:transparent;border:0;display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;cursor:pointer;color:#f6c453;font-size:16px;';
        btn.addEventListener('click', showCustomCaptureLog);
        sidebar.appendChild(btn);
    }

    setInterval(injectCaptureLogButton, 2000);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectCaptureLogButton, { once: true });
    else injectCaptureLogButton();
})();
