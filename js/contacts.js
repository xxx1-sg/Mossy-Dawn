/**
 * 晓山青 Viridiore - 紧急联系人模块
 */

import { Storage } from './core.js';

// ==================== 联系人头像映射 ====================
const CONTACT_AVATARS = {
    '家人': '👨‍👩‍👧', '朋友': '🤝', '同事': '💼',
    '救援队': '🚑', '其他': '👤'
};

// ==================== 防误触状态 ====================
let pendingDeleteId = null;
let editFormDirty = false;
let dragSrcEl = null;

// ==================== 联系人数据加载/保存 ====================
function loadEmergencyContacts() {
    const stored = localStorage.getItem('xiaoshanqing_emergencyContacts');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.warn('[晓山青 Viridiore] 紧急联系人数据解析失败，使用默认数据');
        }
    }
    return [
        { id: 1, name: '父亲', phone: '13715337977', type: '家人', avatar: CONTACT_AVATARS['家人'] },
        { id: 2, name: '妻子', phone: '18026914126', type: '家人', avatar: CONTACT_AVATARS['家人'] },
        { id: 3, name: '当地救援队', phone: '110000000', type: '救援队', avatar: CONTACT_AVATARS['救援队'] }
    ];
}

function saveEmergencyContacts() {
    localStorage.setItem('xiaoshanqing_emergencyContacts', JSON.stringify(window.emergencyContacts));
    const el = document.getElementById('emergencyValue');
    if (el) el.textContent = '已设置 ' + window.emergencyContacts.length + ' 人';
    if (window.updateHeroDashboard) window.updateHeroDashboard();
}

let emergencyContacts = loadEmergencyContacts();

// ==================== 渲染 ====================
function renderEmergencyContactsPreview() {
    const container = document.getElementById('emergencyContactsPreview');
    if (!container) return;

    if (window.emergencyContacts.length === 0) {
        container.innerHTML = '<p style="color:var(--text-light);padding:1rem;text-align:center;font-size:0.9rem;">暂无紧急联系人</p>';
    } else {
        container.innerHTML = window.emergencyContacts.slice(0, 3).map(contact => `
            <div class="contact-item" style="display:flex;align-items:center;padding:0.5rem;background:var(--light-bg);border-radius:8px;margin-bottom:0.5rem;">
                <div class="avatar" style="background:var(--primary-color);margin-right:0.8rem;width:36px;height:36px;font-size:1.2rem;">${contact.avatar}</div>
                <div class="info" style="flex:1;">
                    <div class="label" style="font-weight:bold;font-size:0.9rem;">${contact.name}</div>
                    <div class="value" style="font-size:0.8rem;">${contact.phone}</div>
                </div>
            </div>
        `).join('');
        if (window.emergencyContacts.length > 3) {
            container.innerHTML += '<p style="color:var(--text-light);font-size:0.8rem;text-align:center;">另有 ' + (window.emergencyContacts.length - 3) + ' 位联系人...</p>';
        }
    }

    const el = document.getElementById('emergencyValue');
    if (el) el.textContent = '已设置 ' + window.emergencyContacts.length + ' 人';
    if (window.updateHeroDashboard) window.updateHeroDashboard();
}

function initEmergencyContactsDisplay() {
    renderEmergencyContactsPreview();
}

// ==================== 联系人编辑器 ====================
function openEmergencyContactsEditor() {
    const modal = document.getElementById('emergencyContactsModal');
    const content = document.getElementById('emergencyContactsModalContent');
    if (!modal || !content) return;
    content.innerHTML = `
        <h3 style="text-align:center;margin-bottom:0.3rem;">👥 紧急联系人管理</h3>
        <p style="color:var(--text-light);margin-bottom:1rem;font-size:0.9rem;text-align:center;">SOS 求救时会按优先级依次通知</p>
        <div id="ecList" style="max-height:320px;overflow-y:auto;margin-bottom:1rem;padding:0.2rem;"></div>
        <button class="action-btn action-btn--warm action-btn--block" type="button"
            onclick="openAddContactModal()" style="margin-bottom:0.8rem;">＋ 添加新联系人</button>
        <button class="modal-btn secondary" type="button" onclick="closeEmergencyContactsEditor()">完成</button>
    `;
    modal.classList.add('active');
    renderEcList();
}

function closeEmergencyContactsEditor() {
    if (editFormDirty) {
        openUnsavedModal();
        return;
    }
    document.getElementById('emergencyContactsModal')?.classList.remove('active');
    renderEmergencyContactsPreview();
}

// ==================== 渲染联系人列表 ====================
function renderEcList() {
    const list = document.getElementById('ecList');
    if (!list) return;

    if (window.emergencyContacts.length === 0) {
        list.innerHTML = `
            <div style="text-align:center;padding:2rem 1rem;color:var(--text-light);">
                <div style="font-size:3rem;margin-bottom:0.8rem;">🚫</div>
                <p style="margin-bottom:1rem;">还没有添加任何紧急联系人</p>
                <button class="action-btn action-btn--warm" type="button" onclick="openAddContactModal()">＋ 添加第一位联系人</button>
            </div>`;
        return;
    }

    list.innerHTML = window.emergencyContacts.map((contact, index) => `
        <div class="ec-list-item" data-id="${contact.id}" draggable="true"
            ondragstart="handleDragStart(event, ${contact.id})"
            ondragover="handleDragOver(event)"
            ondrop="handleDrop(event, ${contact.id})"
            ondragend="handleDragEnd(event)">
            <span class="ec-drag-handle" title="拖动排序">☰</span>
            <div class="avatar" style="background:var(--primary-color);margin-right:0.8rem;width:40px;height:40px;font-size:1.2rem;flex-shrink:0;">${contact.avatar}</div>
            <div class="ec-info" style="flex:1;min-width:0;">
                <div class="ec-name">${contact.name}</div>
                <div class="ec-phone">${contact.phone}</div>
                <div class="ec-type">${contact.type}</div>
            </div>
            <div class="ec-actions">
                <button type="button" class="ec-btn ec-btn--edit" onclick="openEditContactModal(${contact.id})" title="编辑">✏️</button>
                <button type="button" class="ec-btn ec-btn--del" onclick="openDeleteConfirm(${contact.id})" title="删除">🗑️</button>
            </div>
            <span class="ec-priority">${index + 1}</span>
        </div>
    `).join('');
}

// ==================== 添加/编辑 ====================
function openAddContactModal() {
    editFormDirty = true;
    const titleEl = document.getElementById('contactEditModalTitle');
    if (titleEl) titleEl.textContent = '添加联系人';
    const idEl = document.getElementById('editContactId');
    if (idEl) idEl.value = '';
    const nameEl = document.getElementById('editContactName');
    if (nameEl) nameEl.value = '';
    const phoneEl = document.getElementById('editContactPhone');
    if (phoneEl) phoneEl.value = '';
    const typeEl = document.getElementById('editContactType');
    if (typeEl) typeEl.value = '家人';
    clearEditErrors();
    const modal = document.getElementById('contactEditModal');
    if (modal) modal.classList.add('active');
}

function openEditContactModal(id) {
    const contact = window.emergencyContacts.find(c => c.id === id);
    if (!contact) return;
    editFormDirty = true;
    const titleEl = document.getElementById('contactEditModalTitle');
    if (titleEl) titleEl.textContent = '编辑联系人';
    const idEl = document.getElementById('editContactId');
    if (idEl) idEl.value = contact.id;
    const nameEl = document.getElementById('editContactName');
    if (nameEl) nameEl.value = contact.name;
    const phoneEl = document.getElementById('editContactPhone');
    if (phoneEl) phoneEl.value = contact.phone;
    const typeEl = document.getElementById('editContactType');
    if (typeEl) typeEl.value = contact.type;
    clearEditErrors();
    const modal = document.getElementById('contactEditModal');
    if (modal) modal.classList.add('active');
}

// ==================== 表单校验 ====================
function validateContactForm() {
    let valid = true;
    clearEditErrors();

    const nameEl = document.getElementById('editContactName');
    const phoneEl = document.getElementById('editContactPhone');
    if (!nameEl || !phoneEl) return false;

    if (!nameEl.value.trim()) {
        showFieldError('editNameError', '请输入联系人姓名');
        valid = false;
    }
    const phone = phoneEl.value.trim();
    if (!phone) {
        showFieldError('editPhoneError', '请输入手机号');
        valid = false;
    } else if (!/^1[3-9]\d{9}$/.test(phone)) {
        showFieldError('editPhoneError', '请输入正确的手机号');
        valid = false;
    }
    return valid;
}

function showFieldError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) { el.textContent = message; el.style.display = 'block'; }
}

function clearEditErrors() {
    const nameErr = document.getElementById('editNameError');
    const phoneErr = document.getElementById('editPhoneError');
    if (nameErr) { nameErr.textContent = ''; nameErr.style.display = 'none'; }
    if (phoneErr) { phoneErr.textContent = ''; phoneErr.style.display = 'none'; }
}

// ==================== 提交 ====================
function submitContactEdit() {
    if (!validateContactForm()) return;

    const idEl = document.getElementById('editContactId');
    const nameEl = document.getElementById('editContactName');
    const phoneEl = document.getElementById('editContactPhone');
    const typeEl = document.getElementById('editContactType');
    if (!idEl || !nameEl || !phoneEl || !typeEl) return;

    const id = idEl.value;
    const name = nameEl.value.trim();
    const phone = phoneEl.value.trim();
    const type = typeEl.value;

    if (id) {
        const idx = window.emergencyContacts.findIndex(c => c.id === Number(id));
        if (idx !== -1) {
            window.emergencyContacts[idx].name = name;
            window.emergencyContacts[idx].phone = phone;
            window.emergencyContacts[idx].type = type;
            window.emergencyContacts[idx].avatar = CONTACT_AVATARS[type] || CONTACT_AVATARS['其他'];
        }
        if (window.showToast) window.showToast('联系人修改成功', 'success');
    } else {
        const newId = window.emergencyContacts.length > 0
            ? Math.max(...window.emergencyContacts.map(c => c.id)) + 1 : 1;
        window.emergencyContacts.push({
            id: newId, name, phone, type,
            avatar: CONTACT_AVATARS[type] || CONTACT_AVATARS['其他']
        });
        if (window.showToast) window.showToast('联系人添加成功', 'success');
    }

    saveEmergencyContacts();
    editFormDirty = false;
    const modal = document.getElementById('contactEditModal');
    if (modal) modal.classList.remove('active');
    renderEcList();
}

// ==================== 取消编辑（防误触） ====================
function cancelEditContact() {
    const idEl = document.getElementById('editContactId');
    const nameEl = document.getElementById('editContactName');
    const phoneEl = document.getElementById('editContactPhone');
    const typeEl = document.getElementById('editContactType');
    if (!idEl || !nameEl || !phoneEl || !typeEl) return;

    const id = idEl.value;
    const currentName = nameEl.value.trim();
    const currentPhone = phoneEl.value.trim();
    const currentType = typeEl.value;

    if (id) {
        const contact = window.emergencyContacts.find(c => c.id === Number(id));
        if (contact && (contact.name !== currentName || contact.phone !== currentPhone || contact.type !== currentType)) {
            openUnsavedModal();
            return;
        }
    } else if (currentName || currentPhone) {
        openUnsavedModal();
        return;
    }

    const modal = document.getElementById('contactEditModal');
    if (modal) modal.classList.remove('active');
    editFormDirty = false;
}

// ==================== 删除 ====================
function openDeleteConfirm(id) {
    pendingDeleteId = id;
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) modal.classList.add('active');
}

function closeDeleteConfirm() {
    pendingDeleteId = null;
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) modal.classList.remove('active');
}

function confirmDeleteContact() {
    if (pendingDeleteId !== null) {
        window.emergencyContacts = window.emergencyContacts.filter(c => c.id !== pendingDeleteId);
        saveEmergencyContacts();
        renderEcList();
        pendingDeleteId = null;
        closeDeleteConfirm();
        if (window.showToast) window.showToast('联系人已删除', 'success');
    }
}

// ==================== 未保存提示 ====================
function openUnsavedModal() {
    const modal = document.getElementById('unsavedModal');
    if (modal) modal.classList.add('active');
}

function closeUnsavedModal() {
    const modal = document.getElementById('unsavedModal');
    if (modal) modal.classList.remove('active');
}

function forceCloseUnsaved() {
    editFormDirty = false;
    closeUnsavedModal();
    const modal = document.getElementById('contactEditModal');
    if (modal) modal.classList.remove('active');
}

// ==================== 拖拽排序 ====================
function handleDragStart(e, id) {
    dragSrcEl = e.target.closest('.ec-list-item');
    if (dragSrcEl) dragSrcEl.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e, targetId) {
    e.preventDefault();
    if (!dragSrcEl || !window.emergencyContacts) return;

    const srcId = parseInt(dragSrcEl.dataset.id);
    const targetIdx = window.emergencyContacts.findIndex(c => c.id === targetId);
    const srcIdx = window.emergencyContacts.findIndex(c => c.id === srcId);

    if (srcIdx !== -1 && targetIdx !== -1 && srcIdx !== targetIdx) {
        const [moved] = window.emergencyContacts.splice(srcIdx, 1);
        window.emergencyContacts.splice(targetIdx, 0, moved);
        saveEmergencyContacts();
        renderEcList();
    }

    dragSrcEl.style.opacity = '1';
    dragSrcEl = null;
}

function handleDragEnd(e) {
    if (dragSrcEl) dragSrcEl.style.opacity = '1';
    dragSrcEl = null;
}

// ==================== 全局导出（供内联脚本使用）====================
window.emergencyContacts = emergencyContacts;
window.CONTACT_AVATARS = CONTACT_AVATARS;
window.loadEmergencyContacts = loadEmergencyContacts;
window.saveEmergencyContacts = saveEmergencyContacts;
window.renderEmergencyContactsPreview = renderEmergencyContactsPreview;
window.initEmergencyContactsDisplay = initEmergencyContactsDisplay;
window.openEmergencyContactsEditor = openEmergencyContactsEditor;
window.closeEmergencyContactsEditor = closeEmergencyContactsEditor;
window.renderEcList = renderEcList;
window.openAddContactModal = openAddContactModal;
window.openEditContactModal = openEditContactModal;
window.validateContactForm = validateContactForm;
window.showFieldError = showFieldError;
window.clearEditErrors = clearEditErrors;
window.submitContactEdit = submitContactEdit;
window.cancelEditContact = cancelEditContact;
window.openDeleteConfirm = openDeleteConfirm;
window.closeDeleteConfirm = closeDeleteConfirm;
window.confirmDeleteContact = confirmDeleteContact;
window.openUnsavedModal = openUnsavedModal;
window.closeUnsavedModal = closeUnsavedModal;
window.forceCloseUnsaved = forceCloseUnsaved;
window.handleDragStart = handleDragStart;
window.handleDragOver = handleDragOver;
window.handleDrop = handleDrop;
window.handleDragEnd = handleDragEnd;
window.emergencyContacts = emergencyContacts;
