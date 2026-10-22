# E028 人工驗證交接

目前所有人類效果判定均 **awaiting-human**。Agent未代填heard/seen/pass。操作頁 `http://127.0.0.1:5198/`；本地server須持續運行。請先按啟動並解鎖音訊，等待MOD ready。需要錄音時由你允許本站麥克風；音訊僅留本頁記憶體。

請每案記錄tester、UTC時間、browser版本、麥克風／耳機及音量、sessionEpoch、operationId、實際聽到／看到內容與verdict。操作後下載metadata trace，與人類紀錄配對；下載不含原始音訊。Reload會清掉record buffer，且不能證明舊物理工作停止。

| Case | 操作與預期trace | 人類效果 | Result |
| --- | --- | --- | --- |
| H1 | Record5秒，念短句；capture-start使active，同recorder stop事件使inactive；再Host Replay，clock-start與所有natural ends+host terminal才inactive。 | 聽到自己的原句；bytes/Promise不算。 | awaiting-human |
| H2 | Record期間按Say及再按Record。 | 兩者拒絕，無額外dispatch，原錄音繼續；核對實際capture。 | awaiting-human |
| H3 | Say後clock active期間按Record/Replay/Say。 | 後到要求拒絕、原播放不受改寫；聽到固定日文。 | awaiting-human |
| H4 | Head nod；requested/active窗口再次按Head。 | 重入拒絕，全序列含neutral結束才inactive；肉眼核對nod/reset。pose/motor仍unknown。 | awaiting-human |
| H5 | Record+Head；另測Say→Head與Head→Say。 | Record/head分開活動；say/head因appearance衝突整組拒絕，不partial dispatch。 | awaiting-human |
| H6 | 只有可重現時使用瀏覽器權限／中斷條件。 | lifecycle缺失→unknown與busy保留，30秒不釋放；無法重現則unverified，不造failure/pass。 | awaiting-human |

真人填寫模板：

- Tester：待填
- 時間／Browser／設備／音量：待填
- Case／sessionEpoch／operationId／metadata檔：待填
- 實際聲音／畫面與trace：待填
- Verdict與限制：待填

H1–H6的fake-host unit測試只證明控制／觀測程式契約，不替代上述人類觀察。Tone沒有整合；硬體馬達停止、回音消除、ASR及其他provider皆unverified。
