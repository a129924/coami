# 實驗工作區

每個 POC 放在獨立的 `E001-<slug>/` 目錄中，將可執行程式、操作方式與結果放在一起。實驗程式不要直接寫入 `server/src/` 或 `device/src/`；完成驗證後，再根據紀錄決定是否移入正式實作。

每個實驗從 [`TEMPLATE.md`](TEMPLATE.md) 建立紀錄。記下實際操作、可重做的證據與結論；尚未執行的實驗不要填成已驗證。

第一個可見 POC：[`E001-visible-greet/`](E001-visible-greet/README.md)。它從 Server endpoint 觸發 Stack-chan browser simulator 的笑臉與點頭，並記錄 command result。操作方式、驗證結果與截圖都留在該目錄。
