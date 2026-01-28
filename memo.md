openAIとチャットができるようにしたいです。

**要件**
- **環境**: ブラウザでアクセスできるUIを作成。
    - Reactを使用してください。
    - openAIとの連携はlanggraphjsを使ってください。
- **AIの役割**: 
    - システムのヘルプデスクの担当者として回答するようにしてください。
    - ユーザからの質問にElasticSearchで検索し、その結果をもとに回答するようにしてください。


## ログの確認方法
docker-compose logs -f app 

agent.jsのrunAgentを以下のように変更してください。

sample/src/agent.pyのrun_agentと同じ動きになるようにする。
ファイル構成や設計、関数名等はJavaScript・Reactのベストプラクティスに従ってください。



