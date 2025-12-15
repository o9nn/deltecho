const q = Object.create
const u = Object.defineProperty
const b = Object.getOwnPropertyDescriptor
const k = Object.getOwnPropertyNames
const F = Object.getPrototypeOf,
  y = Object.prototype.hasOwnProperty
const i = (e, t) => u(e, 'name', { value: t, configurable: !0 })
const P = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports),
  x = (e, t) => {
    for (const _ in t) u(e, _, { get: t[_], enumerable: !0 })
  },
  w = (e, t, _, r) => {
    if ((t && typeof t == 'object') || typeof t == 'function')
      for (const n of k(t))
        !y.call(e, n) &&
          n !== _ &&
          u(e, n, {
            get: () => t[n],
            enumerable: !(r = b(t, n)) || r.enumerable,
          })
    return e
  }
const U = (e, t, _) => (
  (_ = e != null ? q(F(e)) : {}),
  w(
    t || !e || !e.__esModule
      ? u(_, 'default', { value: e, enumerable: !0 })
      : _,
    e
  )
)
const Y = P((et, H) => {
  let R = null
  typeof WebSocket < 'u'
    ? (R = WebSocket)
    : typeof MozWebSocket < 'u'
      ? (R = MozWebSocket)
      : typeof global < 'u'
        ? (R = global.WebSocket || global.MozWebSocket)
        : typeof window < 'u'
          ? (R = window.WebSocket || window.MozWebSocket)
          : typeof self < 'u' && (R = self.WebSocket || self.MozWebSocket)
  H.exports = R
})
const B = P((at, C) => {
  function I() {}
  i(I, 'E')
  I.prototype = {
    on: function (e, t, _) {
      const r = this.e || (this.e = {})
      return (r[e] || (r[e] = [])).push({ fn: t, ctx: _ }), this
    },
    once: function (e, t, _) {
      const r = this
      function n() {
        r.off(e, n), t.apply(_, arguments)
      }
      return i(n, 'listener'), (n._ = t), this.on(e, n, _)
    },
    emit: function (e) {
      let t = [].slice.call(arguments, 1),
        _ = ((this.e || (this.e = {}))[e] || []).slice(),
        r = 0,
        n = _.length
      for (r; r < n; r++)
        try {
          _[r].fn.apply(_[r].ctx, t)
        } catch (o) {
          console.error(
            "event listener for event '" + String(e) + "' threw an error:",
            o,
            _[r].fn
          )
        }
      return this
    },
    off: function (e, t) {
      const _ = this.e || (this.e = {}),
        r = _[e],
        n = []
      if (r && t)
        for (let o = 0, E = r.length; o < E; o++)
          r[o].fn !== t && r[o].fn._ !== t && n.push(r[o])
      return n.length ? (_[e] = n) : delete _[e], this
    },
  }
  C.exports = I
  C.exports.TinyEmitter = I
})
const S = class {
  static {
    i(this, 'RawClient')
  }
  constructor(t) {
    this._transport = t
  }
  sleep(t) {
    return this._transport.request('sleep', [t])
  }
  checkEmailValidity(t) {
    return this._transport.request('check_email_validity', [t])
  }
  getSystemInfo() {
    return this._transport.request('get_system_info', [])
  }
  getNextEvent() {
    return this._transport.request('get_next_event', [])
  }
  addAccount() {
    return this._transport.request('add_account', [])
  }
  migrateAccount(t) {
    return this._transport.request('migrate_account', [t])
  }
  removeAccount(t) {
    return this._transport.request('remove_account', [t])
  }
  getAllAccountIds() {
    return this._transport.request('get_all_account_ids', [])
  }
  selectAccount(t) {
    return this._transport.request('select_account', [t])
  }
  getSelectedAccountId() {
    return this._transport.request('get_selected_account_id', [])
  }
  getAllAccounts() {
    return this._transport.request('get_all_accounts', [])
  }
  startIoForAllAccounts() {
    return this._transport.request('start_io_for_all_accounts', [])
  }
  stopIoForAllAccounts() {
    return this._transport.request('stop_io_for_all_accounts', [])
  }
  accountsBackgroundFetch(t) {
    return this._transport.request('accounts_background_fetch', [t])
  }
  startIo(t) {
    return this._transport.request('start_io', [t])
  }
  stopIo(t) {
    return this._transport.request('stop_io', [t])
  }
  getAccountInfo(t) {
    return this._transport.request('get_account_info', [t])
  }
  getAccountFileSize(t) {
    return this._transport.request('get_account_file_size', [t])
  }
  getProviderInfo(t, _) {
    return this._transport.request('get_provider_info', [t, _])
  }
  isConfigured(t) {
    return this._transport.request('is_configured', [t])
  }
  getInfo(t) {
    return this._transport.request('get_info', [t])
  }
  getBlobDir(t) {
    return this._transport.request('get_blob_dir', [t])
  }
  copyToBlobDir(t, _) {
    return this._transport.request('copy_to_blob_dir', [t, _])
  }
  draftSelfReport(t) {
    return this._transport.request('draft_self_report', [t])
  }
  setConfig(t, _, r) {
    return this._transport.request('set_config', [t, _, r])
  }
  batchSetConfig(t, _) {
    return this._transport.request('batch_set_config', [t, _])
  }
  setConfigFromQr(t, _) {
    return this._transport.request('set_config_from_qr', [t, _])
  }
  checkQr(t, _) {
    return this._transport.request('check_qr', [t, _])
  }
  getConfig(t, _) {
    return this._transport.request('get_config', [t, _])
  }
  batchGetConfig(t, _) {
    return this._transport.request('batch_get_config', [t, _])
  }
  setStockStrings(t) {
    return this._transport.request('set_stock_strings', [t])
  }
  configure(t) {
    return this._transport.request('configure', [t])
  }
  addOrUpdateTransport(t, _) {
    return this._transport.request('add_or_update_transport', [t, _])
  }
  addTransport(t, _) {
    return this._transport.request('add_transport', [t, _])
  }
  addTransportFromQr(t, _) {
    return this._transport.request('add_transport_from_qr', [t, _])
  }
  listTransports(t) {
    return this._transport.request('list_transports', [t])
  }
  deleteTransport(t, _) {
    return this._transport.request('delete_transport', [t, _])
  }
  stopOngoingProcess(t) {
    return this._transport.request('stop_ongoing_process', [t])
  }
  exportSelfKeys(t, _, r) {
    return this._transport.request('export_self_keys', [t, _, r])
  }
  importSelfKeys(t, _, r) {
    return this._transport.request('import_self_keys', [t, _, r])
  }
  getFreshMsgs(t) {
    return this._transport.request('get_fresh_msgs', [t])
  }
  getFreshMsgCnt(t, _) {
    return this._transport.request('get_fresh_msg_cnt', [t, _])
  }
  getNextMsgs(t) {
    return this._transport.request('get_next_msgs', [t])
  }
  waitNextMsgs(t) {
    return this._transport.request('wait_next_msgs', [t])
  }
  estimateAutoDeletionCount(t, _, r) {
    return this._transport.request('estimate_auto_deletion_count', [t, _, r])
  }
  initiateAutocryptKeyTransfer(t) {
    return this._transport.request('initiate_autocrypt_key_transfer', [t])
  }
  continueAutocryptKeyTransfer(t, _, r) {
    return this._transport.request('continue_autocrypt_key_transfer', [t, _, r])
  }
  getChatlistEntries(t, _, r, n) {
    return this._transport.request('get_chatlist_entries', [t, _, r, n])
  }
  getSimilarChatIds(t, _) {
    return this._transport.request('get_similar_chat_ids', [t, _])
  }
  getChatlistItemsByEntries(t, _) {
    return this._transport.request('get_chatlist_items_by_entries', [t, _])
  }
  getFullChatById(t, _) {
    return this._transport.request('get_full_chat_by_id', [t, _])
  }
  getBasicChatInfo(t, _) {
    return this._transport.request('get_basic_chat_info', [t, _])
  }
  acceptChat(t, _) {
    return this._transport.request('accept_chat', [t, _])
  }
  blockChat(t, _) {
    return this._transport.request('block_chat', [t, _])
  }
  deleteChat(t, _) {
    return this._transport.request('delete_chat', [t, _])
  }
  getChatEncryptionInfo(t, _) {
    return this._transport.request('get_chat_encryption_info', [t, _])
  }
  getChatSecurejoinQrCode(t, _) {
    return this._transport.request('get_chat_securejoin_qr_code', [t, _])
  }
  getChatSecurejoinQrCodeSvg(t, _) {
    return this._transport.request('get_chat_securejoin_qr_code_svg', [t, _])
  }
  secureJoin(t, _) {
    return this._transport.request('secure_join', [t, _])
  }
  leaveGroup(t, _) {
    return this._transport.request('leave_group', [t, _])
  }
  removeContactFromChat(t, _, r) {
    return this._transport.request('remove_contact_from_chat', [t, _, r])
  }
  addContactToChat(t, _, r) {
    return this._transport.request('add_contact_to_chat', [t, _, r])
  }
  getChatContacts(t, _) {
    return this._transport.request('get_chat_contacts', [t, _])
  }
  getPastChatContacts(t, _) {
    return this._transport.request('get_past_chat_contacts', [t, _])
  }
  createGroupChat(t, _, r) {
    return this._transport.request('create_group_chat', [t, _, r])
  }
  createBroadcastList(t) {
    return this._transport.request('create_broadcast_list', [t])
  }
  setChatName(t, _, r) {
    return this._transport.request('set_chat_name', [t, _, r])
  }
  setChatProfileImage(t, _, r) {
    return this._transport.request('set_chat_profile_image', [t, _, r])
  }
  setChatVisibility(t, _, r) {
    return this._transport.request('set_chat_visibility', [t, _, r])
  }
  setChatEphemeralTimer(t, _, r) {
    return this._transport.request('set_chat_ephemeral_timer', [t, _, r])
  }
  getChatEphemeralTimer(t, _) {
    return this._transport.request('get_chat_ephemeral_timer', [t, _])
  }
  addDeviceMessage(t, _, r) {
    return this._transport.request('add_device_message', [t, _, r])
  }
  marknoticedChat(t, _) {
    return this._transport.request('marknoticed_chat', [t, _])
  }
  getFirstUnreadMessageOfChat(t, _) {
    return this._transport.request('get_first_unread_message_of_chat', [t, _])
  }
  setChatMuteDuration(t, _, r) {
    return this._transport.request('set_chat_mute_duration', [t, _, r])
  }
  isChatMuted(t, _) {
    return this._transport.request('is_chat_muted', [t, _])
  }
  markseenMsgs(t, _) {
    return this._transport.request('markseen_msgs', [t, _])
  }
  getMessageIds(t, _, r, n) {
    return this._transport.request('get_message_ids', [t, _, r, n])
  }
  getMessageListItems(t, _, r, n) {
    return this._transport.request('get_message_list_items', [t, _, r, n])
  }
  getMessage(t, _) {
    return this._transport.request('get_message', [t, _])
  }
  getMessageHtml(t, _) {
    return this._transport.request('get_message_html', [t, _])
  }
  getMessages(t, _) {
    return this._transport.request('get_messages', [t, _])
  }
  getMessageNotificationInfo(t, _) {
    return this._transport.request('get_message_notification_info', [t, _])
  }
  deleteMessages(t, _) {
    return this._transport.request('delete_messages', [t, _])
  }
  deleteMessagesForAll(t, _) {
    return this._transport.request('delete_messages_for_all', [t, _])
  }
  getMessageInfo(t, _) {
    return this._transport.request('get_message_info', [t, _])
  }
  getMessageInfoObject(t, _) {
    return this._transport.request('get_message_info_object', [t, _])
  }
  getMessageReadReceipts(t, _) {
    return this._transport.request('get_message_read_receipts', [t, _])
  }
  downloadFullMessage(t, _) {
    return this._transport.request('download_full_message', [t, _])
  }
  searchMessages(t, _, r) {
    return this._transport.request('search_messages', [t, _, r])
  }
  messageIdsToSearchResults(t, _) {
    return this._transport.request('message_ids_to_search_results', [t, _])
  }
  saveMsgs(t, _) {
    return this._transport.request('save_msgs', [t, _])
  }
  getContact(t, _) {
    return this._transport.request('get_contact', [t, _])
  }
  createContact(t, _, r) {
    return this._transport.request('create_contact', [t, _, r])
  }
  createChatByContactId(t, _) {
    return this._transport.request('create_chat_by_contact_id', [t, _])
  }
  blockContact(t, _) {
    return this._transport.request('block_contact', [t, _])
  }
  unblockContact(t, _) {
    return this._transport.request('unblock_contact', [t, _])
  }
  getBlockedContacts(t) {
    return this._transport.request('get_blocked_contacts', [t])
  }
  getContactIds(t, _, r) {
    return this._transport.request('get_contact_ids', [t, _, r])
  }
  getContacts(t, _, r) {
    return this._transport.request('get_contacts', [t, _, r])
  }
  getContactsByIds(t, _) {
    return this._transport.request('get_contacts_by_ids', [t, _])
  }
  deleteContact(t, _) {
    return this._transport.request('delete_contact', [t, _])
  }
  resetContactEncryption(t, _) {
    return this._transport.request('reset_contact_encryption', [t, _])
  }
  changeContactName(t, _, r) {
    return this._transport.request('change_contact_name', [t, _, r])
  }
  getContactEncryptionInfo(t, _) {
    return this._transport.request('get_contact_encryption_info', [t, _])
  }
  lookupContactIdByAddr(t, _) {
    return this._transport.request('lookup_contact_id_by_addr', [t, _])
  }
  parseVcard(t) {
    return this._transport.request('parse_vcard', [t])
  }
  importVcard(t, _) {
    return this._transport.request('import_vcard', [t, _])
  }
  importVcardContents(t, _) {
    return this._transport.request('import_vcard_contents', [t, _])
  }
  makeVcard(t, _) {
    return this._transport.request('make_vcard', [t, _])
  }
  setDraftVcard(t, _, r) {
    return this._transport.request('set_draft_vcard', [t, _, r])
  }
  getChatIdByContactId(t, _) {
    return this._transport.request('get_chat_id_by_contact_id', [t, _])
  }
  getChatMedia(t, _, r, n, o) {
    return this._transport.request('get_chat_media', [t, _, r, n, o])
  }
  exportBackup(t, _, r) {
    return this._transport.request('export_backup', [t, _, r])
  }
  importBackup(t, _, r) {
    return this._transport.request('import_backup', [t, _, r])
  }
  provideBackup(t) {
    return this._transport.request('provide_backup', [t])
  }
  getBackupQr(t) {
    return this._transport.request('get_backup_qr', [t])
  }
  getBackupQrSvg(t) {
    return this._transport.request('get_backup_qr_svg', [t])
  }
  getBackup(t, _) {
    return this._transport.request('get_backup', [t, _])
  }
  maybeNetwork() {
    return this._transport.request('maybe_network', [])
  }
  getConnectivity(t) {
    return this._transport.request('get_connectivity', [t])
  }
  getConnectivityHtml(t) {
    return this._transport.request('get_connectivity_html', [t])
  }
  getLocations(t, _, r, n, o) {
    return this._transport.request('get_locations', [t, _, r, n, o])
  }
  sendWebxdcStatusUpdate(t, _, r, n) {
    return this._transport.request('send_webxdc_status_update', [t, _, r, n])
  }
  sendWebxdcRealtimeData(t, _, r) {
    return this._transport.request('send_webxdc_realtime_data', [t, _, r])
  }
  sendWebxdcRealtimeAdvertisement(t, _) {
    return this._transport.request('send_webxdc_realtime_advertisement', [t, _])
  }
  leaveWebxdcRealtime(t, _) {
    return this._transport.request('leave_webxdc_realtime', [t, _])
  }
  getWebxdcStatusUpdates(t, _, r) {
    return this._transport.request('get_webxdc_status_updates', [t, _, r])
  }
  getWebxdcInfo(t, _) {
    return this._transport.request('get_webxdc_info', [t, _])
  }
  getWebxdcHref(t, _) {
    return this._transport.request('get_webxdc_href', [t, _])
  }
  getWebxdcBlob(t, _, r) {
    return this._transport.request('get_webxdc_blob', [t, _, r])
  }
  setWebxdcIntegration(t, _) {
    return this._transport.request('set_webxdc_integration', [t, _])
  }
  initWebxdcIntegration(t, _) {
    return this._transport.request('init_webxdc_integration', [t, _])
  }
  getHttpResponse(t, _) {
    return this._transport.request('get_http_response', [t, _])
  }
  forwardMessages(t, _, r) {
    return this._transport.request('forward_messages', [t, _, r])
  }
  resendMessages(t, _) {
    return this._transport.request('resend_messages', [t, _])
  }
  sendSticker(t, _, r) {
    return this._transport.request('send_sticker', [t, _, r])
  }
  sendReaction(t, _, r) {
    return this._transport.request('send_reaction', [t, _, r])
  }
  getMessageReactions(t, _) {
    return this._transport.request('get_message_reactions', [t, _])
  }
  sendMsg(t, _, r) {
    return this._transport.request('send_msg', [t, _, r])
  }
  sendEditRequest(t, _, r) {
    return this._transport.request('send_edit_request', [t, _, r])
  }
  canSend(t, _) {
    return this._transport.request('can_send', [t, _])
  }
  saveMsgFile(t, _, r) {
    return this._transport.request('save_msg_file', [t, _, r])
  }
  removeDraft(t, _) {
    return this._transport.request('remove_draft', [t, _])
  }
  getDraft(t, _) {
    return this._transport.request('get_draft', [t, _])
  }
  sendVideochatInvitation(t, _) {
    return this._transport.request('send_videochat_invitation', [t, _])
  }
  miscGetStickerFolder(t) {
    return this._transport.request('misc_get_sticker_folder', [t])
  }
  miscSaveSticker(t, _, r) {
    return this._transport.request('misc_save_sticker', [t, _, r])
  }
  miscGetStickers(t) {
    return this._transport.request('misc_get_stickers', [t])
  }
  miscSendTextMessage(t, _, r) {
    return this._transport.request('misc_send_text_message', [t, _, r])
  }
  miscSendMsg(t, _, r, n, o, E, a) {
    return this._transport.request('misc_send_msg', [t, _, r, n, o, E, a])
  }
  miscSetDraft(t, _, r, n, o, E, a) {
    return this._transport.request('misc_set_draft', [t, _, r, n, o, E, a])
  }
  miscSendDraft(t, _) {
    return this._transport.request('misc_send_draft', [t, _])
  }
}
const A = {}
x(A, { BaseTransport: () => D, WebsocketTransport: () => g })
const T = class {
  static {
    i(this, 'Emitter')
  }
  constructor() {
    this.e = new Map()
  }
  on(t, _, r) {
    return this._on(t, _, r)
  }
  _on(t, _, r) {
    const n = { callback: _, ctx: r }
    return this.e.has(t) || this.e.set(t, []), this.e.get(t).push(n), this
  }
  once(t, _, r) {
    const n = i((...o) => {
      this.off(t, _), _.apply(r, o)
    }, 'listener')
    this._on(t, n, r)
  }
  emit(t, ..._) {
    if (this.e.has(t))
      return (
        this.e.get(t).forEach(r => {
          r.callback.apply(r.ctx, _)
        }),
        this
      )
  }
  off(t, _) {
    if (!this.e.has(t)) return
    const n = this.e.get(t).filter(o => o.callback !== _)
    return n.length ? this.e.set(t, n) : this.e.delete(t), this
  }
}
var D = class extends T {
  static {
    i(this, 'BaseTransport')
  }
  constructor() {
    super(...arguments), (this._requests = new Map()), (this._requestId = 0)
  }
  _send(t) {
    throw new Error('_send method not implemented')
  }
  close() {}
  _onmessage(t) {
    if (t.method) {
      const n = t
      this.emit('request', n)
    }
    if (!t.id) return
    const _ = t
    if (!_.id) return
    const r = this._requests.get(_.id)
    r &&
      (this._requests.delete(_.id),
      _.error ? r.reject(_.error) : r.resolve(_.result))
  }
  notification(t, _) {
    const r = { jsonrpc: '2.0', method: t, id: 0, params: _ }
    this._send(r)
  }
  request(t, _) {
    const r = ++this._requestId,
      n = { jsonrpc: '2.0', method: t, id: r, params: _ }
    return (
      this._send(n),
      new Promise((o, E) => {
        this._requests.set(r, { resolve: o, reject: E })
      })
    )
  }
}
const G = U(Y(), 1)
var g = class extends D {
    static {
      i(this, 'WebsocketTransport')
    }
    get reconnectAttempts() {
      return this._socket.reconnectAttempts
    }
    get connected() {
      return this._socket.connected
    }
    constructor(t, _) {
      super(), (this.url = t)
      const r = i(n => {
        const o = JSON.parse(n.data)
        this._onmessage(o)
      }, 'onmessage')
      ;(this._socket = new O(t, r, _)),
        this._socket.on('connect', () => this.emit('connect')),
        this._socket.on('disconnect', () => this.emit('disconnect')),
        this._socket.on('error', n => this.emit('error', n))
    }
    _send(t) {
      const _ = JSON.stringify(t)
      this._socket.send(_)
    }
    close() {
      this._socket.close()
    }
  },
  O = class extends T {
    static {
      i(this, 'ReconnectingWebsocket')
    }
    constructor(t, _, r) {
      super(),
        (this.url = t),
        (this.preopenQueue = []),
        (this._connected = !1),
        (this._reconnectAttempts = 0),
        (this.closed = !1),
        (this.options = Object.assign(
          {
            reconnectDecay: 1.5,
            reconnectInterval: 1e3,
            maxReconnectInterval: 1e4,
          },
          r
        )),
        (this.onmessage = _),
        this._reconnect()
    }
    get reconnectAttempts() {
      return this._reconnectAttempts
    }
    _reconnect() {
      if (this.closed) return
      let t
      ;(this.ready = new Promise(_ => (t = _))),
        (this.socket = new G.default(this.url)),
        (this.socket.onmessage = this.onmessage.bind(this)),
        (this.socket.onopen = _ => {
          for (
            this._reconnectAttempts = 0, this._connected = !0;
            this.preopenQueue.length;

          )
            this.socket.send(this.preopenQueue.shift())
          this.emit('connect'), t()
        }),
        (this.socket.onerror = _ => {
          this.emit('error', _)
        }),
        (this.socket.onclose = _ => {
          ;(this._connected = !1), this.emit('disconnect')
          const r = Math.min(
            this.options.reconnectInterval *
              Math.pow(this.options.reconnectDecay, this._reconnectAttempts),
            this.options.maxReconnectInterval
          )
          setTimeout(() => {
            ;(this._reconnectAttempts += 1), this._reconnect()
          }, r)
        })
    }
    get connected() {
      return this._connected
    }
    send(t) {
      this.connected ? this.socket.send(t) : this.preopenQueue.push(t)
    }
    close() {
      ;(this.closed = !0), this.socket.close()
    }
  }
const l = U(B(), 1)
const p = class extends l.TinyEmitter {
  static {
    i(this, 'BaseDeltaChat')
  }
  constructor(t, _) {
    super(),
      (this.transport = t),
      (this.contextEmitters = {}),
      (this.rpc = new S(this.transport)),
      _ && (this.eventTask = this.eventLoop())
  }
  async eventLoop() {
    for (;;) {
      const t = await this.rpc.getNextEvent()
      this.emit(t.event.kind, t.contextId, t.event),
        this.emit('ALL', t.contextId, t.event),
        this.contextEmitters[t.contextId] &&
          (this.contextEmitters[t.contextId].emit(t.event.kind, t.event),
          this.contextEmitters[t.contextId].emit('ALL', t.event))
    }
  }
  async listAccounts() {
    return await this.rpc.getAllAccounts()
  }
  getContextEvents(t) {
    return this.contextEmitters[t]
      ? this.contextEmitters[t]
      : ((this.contextEmitters[t] = new l.TinyEmitter()),
        this.contextEmitters[t])
  }
}
let N
;(function (e) {
  ;(e[(e.DC_CERTCK_ACCEPT_INVALID = 2)] = 'DC_CERTCK_ACCEPT_INVALID'),
    (e[(e.DC_CERTCK_ACCEPT_INVALID_CERTIFICATES = 3)] =
      'DC_CERTCK_ACCEPT_INVALID_CERTIFICATES'),
    (e[(e.DC_CERTCK_AUTO = 0)] = 'DC_CERTCK_AUTO'),
    (e[(e.DC_CERTCK_STRICT = 1)] = 'DC_CERTCK_STRICT'),
    (e[(e.DC_CHAT_ID_ALLDONE_HINT = 7)] = 'DC_CHAT_ID_ALLDONE_HINT'),
    (e[(e.DC_CHAT_ID_ARCHIVED_LINK = 6)] = 'DC_CHAT_ID_ARCHIVED_LINK'),
    (e[(e.DC_CHAT_ID_LAST_SPECIAL = 9)] = 'DC_CHAT_ID_LAST_SPECIAL'),
    (e[(e.DC_CHAT_ID_TRASH = 3)] = 'DC_CHAT_ID_TRASH'),
    (e[(e.DC_CHAT_TYPE_BROADCAST = 160)] = 'DC_CHAT_TYPE_BROADCAST'),
    (e[(e.DC_CHAT_TYPE_GROUP = 120)] = 'DC_CHAT_TYPE_GROUP'),
    (e[(e.DC_CHAT_TYPE_MAILINGLIST = 140)] = 'DC_CHAT_TYPE_MAILINGLIST'),
    (e[(e.DC_CHAT_TYPE_SINGLE = 100)] = 'DC_CHAT_TYPE_SINGLE'),
    (e[(e.DC_CHAT_TYPE_UNDEFINED = 0)] = 'DC_CHAT_TYPE_UNDEFINED'),
    (e[(e.DC_CONNECTIVITY_CONNECTED = 4e3)] = 'DC_CONNECTIVITY_CONNECTED'),
    (e[(e.DC_CONNECTIVITY_CONNECTING = 2e3)] = 'DC_CONNECTIVITY_CONNECTING'),
    (e[(e.DC_CONNECTIVITY_NOT_CONNECTED = 1e3)] =
      'DC_CONNECTIVITY_NOT_CONNECTED'),
    (e[(e.DC_CONNECTIVITY_WORKING = 3e3)] = 'DC_CONNECTIVITY_WORKING'),
    (e[(e.DC_CONTACT_ID_DEVICE = 5)] = 'DC_CONTACT_ID_DEVICE'),
    (e[(e.DC_CONTACT_ID_INFO = 2)] = 'DC_CONTACT_ID_INFO'),
    (e[(e.DC_CONTACT_ID_LAST_SPECIAL = 9)] = 'DC_CONTACT_ID_LAST_SPECIAL'),
    (e[(e.DC_CONTACT_ID_SELF = 1)] = 'DC_CONTACT_ID_SELF'),
    (e[(e.DC_GCL_ADD_ALLDONE_HINT = 4)] = 'DC_GCL_ADD_ALLDONE_HINT'),
    (e[(e.DC_GCL_ADD_SELF = 2)] = 'DC_GCL_ADD_SELF'),
    (e[(e.DC_GCL_ARCHIVED_ONLY = 1)] = 'DC_GCL_ARCHIVED_ONLY'),
    (e[(e.DC_GCL_FOR_FORWARDING = 8)] = 'DC_GCL_FOR_FORWARDING'),
    (e[(e.DC_GCL_NO_SPECIALS = 2)] = 'DC_GCL_NO_SPECIALS'),
    (e[(e.DC_GCL_VERIFIED_ONLY = 1)] = 'DC_GCL_VERIFIED_ONLY'),
    (e[(e.DC_GCM_ADDDAYMARKER = 1)] = 'DC_GCM_ADDDAYMARKER'),
    (e[(e.DC_GCM_INFO_ONLY = 2)] = 'DC_GCM_INFO_ONLY'),
    (e[(e.DC_LP_AUTH_NORMAL = 4)] = 'DC_LP_AUTH_NORMAL'),
    (e[(e.DC_LP_AUTH_OAUTH2 = 2)] = 'DC_LP_AUTH_OAUTH2'),
    (e[(e.DC_MEDIA_QUALITY_BALANCED = 0)] = 'DC_MEDIA_QUALITY_BALANCED'),
    (e[(e.DC_MEDIA_QUALITY_WORSE = 1)] = 'DC_MEDIA_QUALITY_WORSE'),
    (e[(e.DC_MSG_ID_DAYMARKER = 9)] = 'DC_MSG_ID_DAYMARKER'),
    (e[(e.DC_MSG_ID_LAST_SPECIAL = 9)] = 'DC_MSG_ID_LAST_SPECIAL'),
    (e[(e.DC_MSG_ID_MARKER1 = 1)] = 'DC_MSG_ID_MARKER1'),
    (e[(e.DC_PROVIDER_STATUS_BROKEN = 3)] = 'DC_PROVIDER_STATUS_BROKEN'),
    (e[(e.DC_PROVIDER_STATUS_OK = 1)] = 'DC_PROVIDER_STATUS_OK'),
    (e[(e.DC_PROVIDER_STATUS_PREPARATION = 2)] =
      'DC_PROVIDER_STATUS_PREPARATION'),
    (e[(e.DC_PUSH_CONNECTED = 2)] = 'DC_PUSH_CONNECTED'),
    (e[(e.DC_PUSH_HEARTBEAT = 1)] = 'DC_PUSH_HEARTBEAT'),
    (e[(e.DC_PUSH_NOT_CONNECTED = 0)] = 'DC_PUSH_NOT_CONNECTED'),
    (e[(e.DC_SHOW_EMAILS_ACCEPTED_CONTACTS = 1)] =
      'DC_SHOW_EMAILS_ACCEPTED_CONTACTS'),
    (e[(e.DC_SHOW_EMAILS_ALL = 2)] = 'DC_SHOW_EMAILS_ALL'),
    (e[(e.DC_SHOW_EMAILS_OFF = 0)] = 'DC_SHOW_EMAILS_OFF'),
    (e[(e.DC_SOCKET_AUTO = 0)] = 'DC_SOCKET_AUTO'),
    (e[(e.DC_SOCKET_PLAIN = 3)] = 'DC_SOCKET_PLAIN'),
    (e[(e.DC_SOCKET_SSL = 1)] = 'DC_SOCKET_SSL'),
    (e[(e.DC_SOCKET_STARTTLS = 2)] = 'DC_SOCKET_STARTTLS'),
    (e[(e.DC_STATE_IN_FRESH = 10)] = 'DC_STATE_IN_FRESH'),
    (e[(e.DC_STATE_IN_NOTICED = 13)] = 'DC_STATE_IN_NOTICED'),
    (e[(e.DC_STATE_IN_SEEN = 16)] = 'DC_STATE_IN_SEEN'),
    (e[(e.DC_STATE_OUT_DELIVERED = 26)] = 'DC_STATE_OUT_DELIVERED'),
    (e[(e.DC_STATE_OUT_DRAFT = 19)] = 'DC_STATE_OUT_DRAFT'),
    (e[(e.DC_STATE_OUT_FAILED = 24)] = 'DC_STATE_OUT_FAILED'),
    (e[(e.DC_STATE_OUT_MDN_RCVD = 28)] = 'DC_STATE_OUT_MDN_RCVD'),
    (e[(e.DC_STATE_OUT_PENDING = 20)] = 'DC_STATE_OUT_PENDING'),
    (e[(e.DC_STATE_OUT_PREPARING = 18)] = 'DC_STATE_OUT_PREPARING'),
    (e[(e.DC_STATE_UNDEFINED = 0)] = 'DC_STATE_UNDEFINED'),
    (e[(e.DC_STR_AC_SETUP_MSG_BODY = 43)] = 'DC_STR_AC_SETUP_MSG_BODY'),
    (e[(e.DC_STR_AC_SETUP_MSG_SUBJECT = 42)] = 'DC_STR_AC_SETUP_MSG_SUBJECT'),
    (e[(e.DC_STR_ADD_MEMBER_BY_OTHER = 129)] = 'DC_STR_ADD_MEMBER_BY_OTHER'),
    (e[(e.DC_STR_ADD_MEMBER_BY_YOU = 128)] = 'DC_STR_ADD_MEMBER_BY_YOU'),
    (e[(e.DC_STR_AEAP_ADDR_CHANGED = 122)] = 'DC_STR_AEAP_ADDR_CHANGED'),
    (e[(e.DC_STR_AEAP_EXPLANATION_AND_LINK = 123)] =
      'DC_STR_AEAP_EXPLANATION_AND_LINK'),
    (e[(e.DC_STR_ARCHIVEDCHATS = 40)] = 'DC_STR_ARCHIVEDCHATS'),
    (e[(e.DC_STR_AUDIO = 11)] = 'DC_STR_AUDIO'),
    (e[(e.DC_STR_BACKUP_TRANSFER_MSG_BODY = 163)] =
      'DC_STR_BACKUP_TRANSFER_MSG_BODY'),
    (e[(e.DC_STR_BACKUP_TRANSFER_QR = 162)] = 'DC_STR_BACKUP_TRANSFER_QR'),
    (e[(e.DC_STR_BAD_TIME_MSG_BODY = 85)] = 'DC_STR_BAD_TIME_MSG_BODY'),
    (e[(e.DC_STR_BROADCAST_LIST = 115)] = 'DC_STR_BROADCAST_LIST'),
    (e[(e.DC_STR_CANNOT_LOGIN = 60)] = 'DC_STR_CANNOT_LOGIN'),
    (e[(e.DC_STR_CANTDECRYPT_MSG_BODY = 29)] = 'DC_STR_CANTDECRYPT_MSG_BODY'),
    (e[(e.DC_STR_CHAT_PROTECTION_DISABLED = 171)] =
      'DC_STR_CHAT_PROTECTION_DISABLED'),
    (e[(e.DC_STR_CHAT_PROTECTION_ENABLED = 170)] =
      'DC_STR_CHAT_PROTECTION_ENABLED'),
    (e[(e.DC_STR_CONFIGURATION_FAILED = 84)] = 'DC_STR_CONFIGURATION_FAILED'),
    (e[(e.DC_STR_CONNECTED = 107)] = 'DC_STR_CONNECTED'),
    (e[(e.DC_STR_CONNTECTING = 108)] = 'DC_STR_CONNTECTING'),
    (e[(e.DC_STR_CONTACT = 200)] = 'DC_STR_CONTACT'),
    (e[(e.DC_STR_CONTACT_NOT_VERIFIED = 36)] = 'DC_STR_CONTACT_NOT_VERIFIED'),
    (e[(e.DC_STR_CONTACT_SETUP_CHANGED = 37)] = 'DC_STR_CONTACT_SETUP_CHANGED'),
    (e[(e.DC_STR_CONTACT_VERIFIED = 35)] = 'DC_STR_CONTACT_VERIFIED'),
    (e[(e.DC_STR_DEVICE_MESSAGES = 68)] = 'DC_STR_DEVICE_MESSAGES'),
    (e[(e.DC_STR_DEVICE_MESSAGES_HINT = 70)] = 'DC_STR_DEVICE_MESSAGES_HINT'),
    (e[(e.DC_STR_DOWNLOAD_AVAILABILITY = 100)] =
      'DC_STR_DOWNLOAD_AVAILABILITY'),
    (e[(e.DC_STR_DRAFT = 3)] = 'DC_STR_DRAFT'),
    (e[(e.DC_STR_E2E_AVAILABLE = 25)] = 'DC_STR_E2E_AVAILABLE'),
    (e[(e.DC_STR_E2E_PREFERRED = 34)] = 'DC_STR_E2E_PREFERRED'),
    (e[(e.DC_STR_ENCRYPTEDMSG = 24)] = 'DC_STR_ENCRYPTEDMSG'),
    (e[(e.DC_STR_ENCR_NONE = 28)] = 'DC_STR_ENCR_NONE'),
    (e[(e.DC_STR_ENCR_TRANSP = 27)] = 'DC_STR_ENCR_TRANSP'),
    (e[(e.DC_STR_EPHEMERAL_DAY = 79)] = 'DC_STR_EPHEMERAL_DAY'),
    (e[(e.DC_STR_EPHEMERAL_DAYS = 95)] = 'DC_STR_EPHEMERAL_DAYS'),
    (e[(e.DC_STR_EPHEMERAL_DISABLED = 75)] = 'DC_STR_EPHEMERAL_DISABLED'),
    (e[(e.DC_STR_EPHEMERAL_FOUR_WEEKS = 81)] = 'DC_STR_EPHEMERAL_FOUR_WEEKS'),
    (e[(e.DC_STR_EPHEMERAL_HOUR = 78)] = 'DC_STR_EPHEMERAL_HOUR'),
    (e[(e.DC_STR_EPHEMERAL_HOURS = 94)] = 'DC_STR_EPHEMERAL_HOURS'),
    (e[(e.DC_STR_EPHEMERAL_MINUTE = 77)] = 'DC_STR_EPHEMERAL_MINUTE'),
    (e[(e.DC_STR_EPHEMERAL_MINUTES = 93)] = 'DC_STR_EPHEMERAL_MINUTES'),
    (e[(e.DC_STR_EPHEMERAL_SECONDS = 76)] = 'DC_STR_EPHEMERAL_SECONDS'),
    (e[(e.DC_STR_EPHEMERAL_TIMER_1_DAY_BY_OTHER = 147)] =
      'DC_STR_EPHEMERAL_TIMER_1_DAY_BY_OTHER'),
    (e[(e.DC_STR_EPHEMERAL_TIMER_1_DAY_BY_YOU = 146)] =
      'DC_STR_EPHEMERAL_TIMER_1_DAY_BY_YOU'),
    (e[(e.DC_STR_EPHEMERAL_TIMER_1_HOUR_BY_OTHER = 145)] =
      'DC_STR_EPHEMERAL_TIMER_1_HOUR_BY_OTHER'),
    (e[(e.DC_STR_EPHEMERAL_TIMER_1_HOUR_BY_YOU = 144)] =
      'DC_STR_EPHEMERAL_TIMER_1_HOUR_BY_YOU'),
    (e[(e.DC_STR_EPHEMERAL_TIMER_1_MINUTE_BY_OTHER = 143)] =
      'DC_STR_EPHEMERAL_TIMER_1_MINUTE_BY_OTHER'),
    (e[(e.DC_STR_EPHEMERAL_TIMER_1_MINUTE_BY_YOU = 142)] =
      'DC_STR_EPHEMERAL_TIMER_1_MINUTE_BY_YOU'),
    (e[(e.DC_STR_EPHEMERAL_TIMER_1_WEEK_BY_OTHER = 149)] =
      'DC_STR_EPHEMERAL_TIMER_1_WEEK_BY_OTHER'),
    (e[(e.DC_STR_EPHEMERAL_TIMER_1_WEEK_BY_YOU = 148)] =
      'DC_STR_EPHEMERAL_TIMER_1_WEEK_BY_YOU'),
    (e[(e.DC_STR_EPHEMERAL_TIMER_DAYS_BY_OTHER = 155)] =
      'DC_STR_EPHEMERAL_TIMER_DAYS_BY_OTHER'),
    (e[(e.DC_STR_EPHEMERAL_TIMER_DAYS_BY_YOU = 154)] =
      'DC_STR_EPHEMERAL_TIMER_DAYS_BY_YOU'),
    (e[(e.DC_STR_EPHEMERAL_TIMER_DISABLED_BY_OTHER = 139)] =
      'DC_STR_EPHEMERAL_TIMER_DISABLED_BY_OTHER'),
    (e[(e.DC_STR_EPHEMERAL_TIMER_DISABLED_BY_YOU = 138)] =
      'DC_STR_EPHEMERAL_TIMER_DISABLED_BY_YOU'),
    (e[(e.DC_STR_EPHEMERAL_TIMER_HOURS_BY_OTHER = 153)] =
      'DC_STR_EPHEMERAL_TIMER_HOURS_BY_OTHER'),
    (e[(e.DC_STR_EPHEMERAL_TIMER_HOURS_BY_YOU = 152)] =
      'DC_STR_EPHEMERAL_TIMER_HOURS_BY_YOU'),
    (e[(e.DC_STR_EPHEMERAL_TIMER_MINUTES_BY_OTHER = 151)] =
      'DC_STR_EPHEMERAL_TIMER_MINUTES_BY_OTHER'),
    (e[(e.DC_STR_EPHEMERAL_TIMER_MINUTES_BY_YOU = 150)] =
      'DC_STR_EPHEMERAL_TIMER_MINUTES_BY_YOU'),
    (e[(e.DC_STR_EPHEMERAL_TIMER_SECONDS_BY_OTHER = 141)] =
      'DC_STR_EPHEMERAL_TIMER_SECONDS_BY_OTHER'),
    (e[(e.DC_STR_EPHEMERAL_TIMER_SECONDS_BY_YOU = 140)] =
      'DC_STR_EPHEMERAL_TIMER_SECONDS_BY_YOU'),
    (e[(e.DC_STR_EPHEMERAL_TIMER_WEEKS_BY_OTHER = 157)] =
      'DC_STR_EPHEMERAL_TIMER_WEEKS_BY_OTHER'),
    (e[(e.DC_STR_EPHEMERAL_TIMER_WEEKS_BY_YOU = 156)] =
      'DC_STR_EPHEMERAL_TIMER_WEEKS_BY_YOU'),
    (e[(e.DC_STR_EPHEMERAL_WEEK = 80)] = 'DC_STR_EPHEMERAL_WEEK'),
    (e[(e.DC_STR_EPHEMERAL_WEEKS = 96)] = 'DC_STR_EPHEMERAL_WEEKS'),
    (e[(e.DC_STR_ERROR = 112)] = 'DC_STR_ERROR'),
    (e[(e.DC_STR_ERROR_NO_NETWORK = 87)] = 'DC_STR_ERROR_NO_NETWORK'),
    (e[(e.DC_STR_FAILED_SENDING_TO = 74)] = 'DC_STR_FAILED_SENDING_TO'),
    (e[(e.DC_STR_FILE = 12)] = 'DC_STR_FILE'),
    (e[(e.DC_STR_FINGERPRINTS = 30)] = 'DC_STR_FINGERPRINTS'),
    (e[(e.DC_STR_FORWARDED = 97)] = 'DC_STR_FORWARDED'),
    (e[(e.DC_STR_GIF = 23)] = 'DC_STR_GIF'),
    (e[(e.DC_STR_GROUP_IMAGE_CHANGED_BY_OTHER = 127)] =
      'DC_STR_GROUP_IMAGE_CHANGED_BY_OTHER'),
    (e[(e.DC_STR_GROUP_IMAGE_CHANGED_BY_YOU = 126)] =
      'DC_STR_GROUP_IMAGE_CHANGED_BY_YOU'),
    (e[(e.DC_STR_GROUP_IMAGE_DELETED_BY_OTHER = 135)] =
      'DC_STR_GROUP_IMAGE_DELETED_BY_OTHER'),
    (e[(e.DC_STR_GROUP_IMAGE_DELETED_BY_YOU = 134)] =
      'DC_STR_GROUP_IMAGE_DELETED_BY_YOU'),
    (e[(e.DC_STR_GROUP_LEFT_BY_OTHER = 133)] = 'DC_STR_GROUP_LEFT_BY_OTHER'),
    (e[(e.DC_STR_GROUP_LEFT_BY_YOU = 132)] = 'DC_STR_GROUP_LEFT_BY_YOU'),
    (e[(e.DC_STR_GROUP_NAME_CHANGED_BY_OTHER = 125)] =
      'DC_STR_GROUP_NAME_CHANGED_BY_OTHER'),
    (e[(e.DC_STR_GROUP_NAME_CHANGED_BY_YOU = 124)] =
      'DC_STR_GROUP_NAME_CHANGED_BY_YOU'),
    (e[(e.DC_STR_IMAGE = 9)] = 'DC_STR_IMAGE'),
    (e[(e.DC_STR_INCOMING_MESSAGES = 103)] = 'DC_STR_INCOMING_MESSAGES'),
    (e[(e.DC_STR_INVALID_UNENCRYPTED_MAIL = 174)] =
      'DC_STR_INVALID_UNENCRYPTED_MAIL'),
    (e[(e.DC_STR_LAST_MSG_SENT_SUCCESSFULLY = 111)] =
      'DC_STR_LAST_MSG_SENT_SUCCESSFULLY'),
    (e[(e.DC_STR_LOCATION = 66)] = 'DC_STR_LOCATION'),
    (e[(e.DC_STR_LOCATION_ENABLED_BY_OTHER = 137)] =
      'DC_STR_LOCATION_ENABLED_BY_OTHER'),
    (e[(e.DC_STR_LOCATION_ENABLED_BY_YOU = 136)] =
      'DC_STR_LOCATION_ENABLED_BY_YOU'),
    (e[(e.DC_STR_MESSAGES = 114)] = 'DC_STR_MESSAGES'),
    (e[(e.DC_STR_MESSAGE_ADD_MEMBER = 173)] = 'DC_STR_MESSAGE_ADD_MEMBER'),
    (e[(e.DC_STR_MSGACTIONBYME = 63)] = 'DC_STR_MSGACTIONBYME'),
    (e[(e.DC_STR_MSGACTIONBYUSER = 62)] = 'DC_STR_MSGACTIONBYUSER'),
    (e[(e.DC_STR_MSGADDMEMBER = 17)] = 'DC_STR_MSGADDMEMBER'),
    (e[(e.DC_STR_MSGDELMEMBER = 18)] = 'DC_STR_MSGDELMEMBER'),
    (e[(e.DC_STR_MSGGROUPLEFT = 19)] = 'DC_STR_MSGGROUPLEFT'),
    (e[(e.DC_STR_MSGGRPIMGCHANGED = 16)] = 'DC_STR_MSGGRPIMGCHANGED'),
    (e[(e.DC_STR_MSGGRPIMGDELETED = 33)] = 'DC_STR_MSGGRPIMGDELETED'),
    (e[(e.DC_STR_MSGGRPNAME = 15)] = 'DC_STR_MSGGRPNAME'),
    (e[(e.DC_STR_MSGLOCATIONDISABLED = 65)] = 'DC_STR_MSGLOCATIONDISABLED'),
    (e[(e.DC_STR_MSGLOCATIONENABLED = 64)] = 'DC_STR_MSGLOCATIONENABLED'),
    (e[(e.DC_STR_NEW_GROUP_SEND_FIRST_MESSAGE = 172)] =
      'DC_STR_NEW_GROUP_SEND_FIRST_MESSAGE'),
    (e[(e.DC_STR_NOMESSAGES = 1)] = 'DC_STR_NOMESSAGES'),
    (e[(e.DC_STR_NOT_CONNECTED = 121)] = 'DC_STR_NOT_CONNECTED'),
    (e[(e.DC_STR_NOT_SUPPORTED_BY_PROVIDER = 113)] =
      'DC_STR_NOT_SUPPORTED_BY_PROVIDER'),
    (e[(e.DC_STR_ONE_MOMENT = 106)] = 'DC_STR_ONE_MOMENT'),
    (e[(e.DC_STR_OUTGOING_MESSAGES = 104)] = 'DC_STR_OUTGOING_MESSAGES'),
    (e[(e.DC_STR_PARTIAL_DOWNLOAD_MSG_BODY = 99)] =
      'DC_STR_PARTIAL_DOWNLOAD_MSG_BODY'),
    (e[(e.DC_STR_PART_OF_TOTAL_USED = 116)] = 'DC_STR_PART_OF_TOTAL_USED'),
    (e[(e.DC_STR_QUOTA_EXCEEDING_MSG_BODY = 98)] =
      'DC_STR_QUOTA_EXCEEDING_MSG_BODY'),
    (e[(e.DC_STR_REACTED_BY = 177)] = 'DC_STR_REACTED_BY'),
    (e[(e.DC_STR_READRCPT = 31)] = 'DC_STR_READRCPT'),
    (e[(e.DC_STR_READRCPT_MAILBODY = 32)] = 'DC_STR_READRCPT_MAILBODY'),
    (e[(e.DC_STR_REMOVE_MEMBER_BY_OTHER = 131)] =
      'DC_STR_REMOVE_MEMBER_BY_OTHER'),
    (e[(e.DC_STR_REMOVE_MEMBER_BY_YOU = 130)] = 'DC_STR_REMOVE_MEMBER_BY_YOU'),
    (e[(e.DC_STR_REPLY_NOUN = 90)] = 'DC_STR_REPLY_NOUN'),
    (e[(e.DC_STR_SAVED_MESSAGES = 69)] = 'DC_STR_SAVED_MESSAGES'),
    (e[(e.DC_STR_SECUREJOIN_TAKES_LONGER = 192)] =
      'DC_STR_SECUREJOIN_TAKES_LONGER'),
    (e[(e.DC_STR_SECUREJOIN_WAIT = 190)] = 'DC_STR_SECUREJOIN_WAIT'),
    (e[(e.DC_STR_SECUREJOIN_WAIT_TIMEOUT = 191)] =
      'DC_STR_SECUREJOIN_WAIT_TIMEOUT'),
    (e[(e.DC_STR_SECURE_JOIN_GROUP_QR_DESC = 120)] =
      'DC_STR_SECURE_JOIN_GROUP_QR_DESC'),
    (e[(e.DC_STR_SECURE_JOIN_REPLIES = 118)] = 'DC_STR_SECURE_JOIN_REPLIES'),
    (e[(e.DC_STR_SECURE_JOIN_STARTED = 117)] = 'DC_STR_SECURE_JOIN_STARTED'),
    (e[(e.DC_STR_SELF = 2)] = 'DC_STR_SELF'),
    (e[(e.DC_STR_SELF_DELETED_MSG_BODY = 91)] = 'DC_STR_SELF_DELETED_MSG_BODY'),
    (e[(e.DC_STR_SENDING = 110)] = 'DC_STR_SENDING'),
    (e[(e.DC_STR_SERVER_TURNED_OFF = 92)] = 'DC_STR_SERVER_TURNED_OFF'),
    (e[(e.DC_STR_SETUP_CONTACT_QR_DESC = 119)] =
      'DC_STR_SETUP_CONTACT_QR_DESC'),
    (e[(e.DC_STR_STICKER = 67)] = 'DC_STR_STICKER'),
    (e[(e.DC_STR_STORAGE_ON_DOMAIN = 105)] = 'DC_STR_STORAGE_ON_DOMAIN'),
    (e[(e.DC_STR_SUBJECT_FOR_NEW_CONTACT = 73)] =
      'DC_STR_SUBJECT_FOR_NEW_CONTACT'),
    (e[(e.DC_STR_SYNC_MSG_BODY = 102)] = 'DC_STR_SYNC_MSG_BODY'),
    (e[(e.DC_STR_SYNC_MSG_SUBJECT = 101)] = 'DC_STR_SYNC_MSG_SUBJECT'),
    (e[(e.DC_STR_UNKNOWN_SENDER_FOR_CHAT = 72)] =
      'DC_STR_UNKNOWN_SENDER_FOR_CHAT'),
    (e[(e.DC_STR_UPDATE_REMINDER_MSG_BODY = 86)] =
      'DC_STR_UPDATE_REMINDER_MSG_BODY'),
    (e[(e.DC_STR_UPDATING = 109)] = 'DC_STR_UPDATING'),
    (e[(e.DC_STR_VIDEO = 10)] = 'DC_STR_VIDEO'),
    (e[(e.DC_STR_VIDEOCHAT_INVITATION = 82)] = 'DC_STR_VIDEOCHAT_INVITATION'),
    (e[(e.DC_STR_VIDEOCHAT_INVITE_MSG_BODY = 83)] =
      'DC_STR_VIDEOCHAT_INVITE_MSG_BODY'),
    (e[(e.DC_STR_VOICEMESSAGE = 7)] = 'DC_STR_VOICEMESSAGE'),
    (e[(e.DC_STR_WELCOME_MESSAGE = 71)] = 'DC_STR_WELCOME_MESSAGE'),
    (e[(e.DC_STR_YOU_REACTED = 176)] = 'DC_STR_YOU_REACTED'),
    (e[(e.DC_TEXT1_DRAFT = 1)] = 'DC_TEXT1_DRAFT'),
    (e[(e.DC_TEXT1_SELF = 3)] = 'DC_TEXT1_SELF'),
    (e[(e.DC_TEXT1_USERNAME = 2)] = 'DC_TEXT1_USERNAME'),
    (e[(e.DC_VIDEOCHATTYPE_BASICWEBRTC = 1)] = 'DC_VIDEOCHATTYPE_BASICWEBRTC'),
    (e[(e.DC_VIDEOCHATTYPE_JITSI = 2)] = 'DC_VIDEOCHATTYPE_JITSI'),
    (e[(e.DC_VIDEOCHATTYPE_UNKNOWN = 0)] = 'DC_VIDEOCHATTYPE_UNKNOWN')
})(N || (N = {}))
let {
    app_getPath: W,
    ipcRenderer: s,
    getPathForFile: V,
  } = window.get_electron_functions(),
  { BaseTransport: K } = A,
  M = !1,
  d = new Map(),
  m = class extends K {
    constructor(_) {
      super()
      this.callCounterFunction = _
      s.on('json-rpc-message', (r, n) => {
        const o = JSON.parse(n)
        if (M) {
          const E = performance.now(),
            a = d.get(o.id)
          d.delete(o.id)
          let v = a != null ? (E - a.sentAt).toFixed(3) : void 0,
            h,
            c = { ...o }
          delete c.jsonrpc,
            a != null &&
              (delete c.id, (h = { ...a.message }), delete h.jsonrpc),
            console.debug(
              '%c\u25BC %c[JSONRPC]',
              'color: red',
              'color:grey',
              `${v} ms`,
              h,
              `->
`,
              c?.result ?? c?.error ?? c
            )
        }
        this._onmessage(o)
      })
    }
    static {
      i(this, 'ElectronTransport')
    }
    _send(_) {
      const r = JSON.stringify(_)
      if ((s.invoke('json-rpc-request', r), M)) {
        const n = performance.now()
        d.set(_.id, { message: _, sentAt: n }),
          setTimeout(() => {
            d.delete(_.id)
          }, 6e4),
          console.debug(
            '%c\u25B2 %c[JSONRPC]',
            'color: green',
            'color:grey',
            _
          ),
          _.method &&
            (this.callCounterFunction(_.method),
            this.callCounterFunction('total'))
      }
    }
  },
  L = class extends p {
    static {
      i(this, 'ElectronDeltachat')
    }
    close() {}
    constructor(t) {
      super(new m(t), !0)
    }
  },
  f = class {
    constructor() {
      this.notificationCallback = () => {}
      this.rc_config = null
      this.runtime_info = null
    }
    static {
      i(this, 'ElectronRuntime')
    }
    onDragFileOut(t) {
      s.send('ondragstart', t)
    }
    isDroppedFileFromOutside(t) {
      const _ = V(t)
      return !/DeltaChat\/.+?\.sqlite-blobs\//gi.test(_.replace('\\', '/'))
    }
    emitUIFullyReady() {
      s.send('frontendReady')
    }
    emitUIReady() {
      s.send('ipcReady')
    }
    createDeltaChatConnection(t) {
      return new L(t)
    }
    openMessageHTML(t, _, r, n, o, E, a) {
      s.invoke('openMessageHTML', t, _, r, n, o, E, a)
    }
    notifyWebxdcStatusUpdate(t, _) {
      s.invoke('webxdc:status-update', t, _)
    }
    notifyWebxdcRealtimeData(t, _, r) {
      s.invoke('webxdc:realtime-data', t, _, r)
    }
    notifyWebxdcMessageChanged(t, _) {
      s.invoke('webxdc:message-changed', t, _)
    }
    notifyWebxdcInstanceDeleted(t, _) {
      s.invoke('webxdc:instance-deleted', t, _)
    }
    openMapsWebxdc(t, _) {
      s.invoke('open-maps-webxdc', t, _)
    }
    saveBackgroundImage(t, _) {
      return s.invoke('saveBackgroundImage', t, _)
    }
    getLocaleData(t) {
      return s.invoke('getLocaleData', t)
    }
    setLocale(t) {
      return s.invoke('setLocale', t)
    }
    getAvailableThemes() {
      return s.invoke('themes.getAvailableThemes')
    }
    getActiveTheme() {
      return s.invoke('themes.getActiveTheme')
    }
    async clearWebxdcDOMStorage(t) {
      s.invoke('webxdc.clearWebxdcDOMStorage', t)
    }
    getWebxdcDiskUsage(t) {
      return s.invoke('webxdc.getWebxdcDiskUsage', t)
    }
    async writeClipboardToTempFile(t) {
      return s.invoke('app.writeClipboardToTempFile')
    }
    writeTempFileFromBase64(t, _) {
      return s.invoke('app.writeTempFileFromBase64', t, _)
    }
    writeTempFile(t, _) {
      return s.invoke('app.writeTempFile', t, _)
    }
    copyFileToInternalTmpDir(t, _) {
      return s.invoke('app.copyFileToInternalTmpDir', t, _)
    }
    removeTempFile(t) {
      return s.invoke('app.removeTempFile', t)
    }
    setNotificationCallback(t) {
      this.notificationCallback = t
    }
    showNotification(t) {
      s.invoke('notifications.show', t)
    }
    clearAllNotifications() {
      s.invoke('notifications.clearAll')
    }
    clearNotifications(t, _) {
      s.invoke('notifications.clear', t, _)
    }
    setBadgeCounter(t) {
      s.invoke('app.setBadgeCountAndTrayIconIndicator', t)
    }
    deleteWebxdcAccountData(t) {
      return s.invoke('delete_webxdc_account_data', t)
    }
    closeAllWebxdcInstances() {
      s.invoke('close-all-webxdc')
    }
    restartApp() {
      s.invoke('restart_app')
    }
    getDesktopSettings() {
      return s.invoke('get-desktop-settings')
    }
    setDesktopSetting(t, _) {
      return s.invoke('set-desktop-setting', t, _)
    }
    getWebxdcIconURL(t, _) {
      return `webxdc-icon:${t}.${_}`
    }
    openWebxdc(t, _) {
      s.invoke('open-webxdc', t, _)
    }
    openPath(t) {
      return s.invoke('electron.shell.openPath', t)
    }
    async getAppPath(t) {
      return W(t)
    }
    async downloadFile(t, _) {
      await s.invoke('saveFile', t, _)
    }
    readClipboardText() {
      return s.invoke('electron.clipboard.readText')
    }
    readClipboardImage() {
      return s.invoke('electron.clipboard.readImage')
    }
    writeClipboardText(t) {
      return s.invoke('electron.clipboard.writeText', t)
    }
    writeClipboardImage(t) {
      return s.invoke('electron.clipboard.writeImage', t)
    }
    transformBlobURL(t) {
      if (!t) return t
      const _ = t.replace(/\\/g, '/').split('/'),
        r = _[_.length - 1]
      return decodeURIComponent(r) === r
        ? t.replace(r, encodeURIComponent(r))
        : t
    }
    transformStickerURL(t) {
      return encodeURI(`file://${t}`)
        .replace(/[?#]/g, encodeURIComponent)
        .replace(/%5C/g, decodeURIComponent)
    }
    async showOpenFileDialog(t) {
      const { filePaths: _ } = await s.invoke('fileChooser', t)
      return _
    }
    openLink(t) {
      t.startsWith('http:') || t.startsWith('https:')
        ? s.invoke('electron.shell.openExternal', t)
        : this.log.error('tried to open a non http/https external link', {
            link: t,
          })
    }
    getRC_Config() {
      if (this.rc_config === null) throw new Error('this.rc_config is not set')
      return this.rc_config
    }
    getRuntimeInfo() {
      if (this.runtime_info === null)
        throw new Error('this.runtime_info is not set')
      return this.runtime_info
    }
    initialize(t, _) {
      this.log = _('runtime/electron')
      const r = (this.rc_config = s.sendSync('get-rc-config'))
      return (
        (this.runtime_info = s.sendSync('get-runtime-info')),
        r['log-debug'] && (M = !0),
        t((...n) => {
          s.send(
            'handleLogMessage',
            ...n.map(o =>
              typeof o == 'object'
                ? JSON.parse(JSON.stringify(o))
                : typeof o == 'function'
                  ? o.toString()
                  : o
            )
          )
        }, this.getRC_Config()),
        s.on('showHelpDialog', this.openHelpWindow.bind(null, void 0)),
        s.on('ClickOnNotification', (n, o) => this.notificationCallback(o)),
        s.on('chooseLanguage', (n, o) => {
          this.onChooseLanguage?.(o)
        }),
        s.on('theme-update', () => this.onThemeUpdate?.()),
        s.on('showAboutDialog', () => this.onShowDialog?.('about')),
        s.on('showKeybindingsDialog', () => this.onShowDialog?.('keybindings')),
        s.on('showSettingsDialog', () => this.onShowDialog?.('settings')),
        s.on('open-url', (n, o) => this.onOpenQrUrl?.(o)),
        s.on('webxdc.sendToChat', (n, o, E, a) =>
          this.onWebxdcSendToChat?.(o, E, a)
        ),
        s.on('onResumeFromSleep', () => this.onResumeFromSleep?.()),
        Promise.resolve()
      )
    }
    openHelpWindow(t) {
      s.send('help', window.localeData.locale, t)
    }
    openLogFile() {
      s.invoke('electron.shell.openPath', this.getCurrentLogLocation())
    }
    getCurrentLogLocation() {
      return s.sendSync('get-log-path')
    }
    reloadWebContent() {
      s.send('reload-main-window')
    }
    getConfigPath() {
      return s.sendSync('get-config-path')
    }
    getAutostartState() {
      return Promise.resolve({ isSupported: !1, isRegistered: !1 })
    }
    checkMediaAccess(t) {
      return s.invoke('checkMediaAccess', t)
    }
    askForMediaAccess(t) {
      return s.invoke('askForMediaAccess', t)
    }
  }
window.r = new f()
//# sourceMappingURL=runtime.js.map
