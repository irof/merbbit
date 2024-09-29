async function renderDiagram(mermaid, mermaidText) {
    return mermaid.render('mermaidDiagram', mermaidText)
        .then(result => result.svg);
}

async function definitionsToMermaidText(definitions) {
    const queues = definitions.queues
        .map(queue => queue.name);

    const exchanges = definitions.exchanges
        .map(exchange => exchange.name);

    const bindings = definitions.bindings
        .map(binding => {
            const {source, destination, routing_key} = binding;

            if (routing_key) {
                if (routing_key === "#") {
                    // "#"の1文字はエスケープしてやる必要がある
                    return `${source} -->|" #35; "| ${destination}`;
                } else {
                    // *をエスケープしてやる必要がある
                    // https://github.com/mermaid-js/mermaid/issues/5824
                    const routingLabel = routing_key.replace(/\*/g, "#42;");
                    return `${source} -->|" ${routingLabel} "| ${destination}`;
                }
            } else {
                // 空はラベルを出さない
                return `${source} --> ${destination}`;
            }
        });

    let mermaidDiagram = 'graph LR;\n';
    // ノードの形と色を https://www.rabbitmq.com/tutorials の表現に合わせる
    mermaidDiagram += `    %% exchanges\n`
    mermaidDiagram += `    classDef exchange fill:#fae0e4;\n`
    exchanges.forEach(exchange => {
        mermaidDiagram += `    ${exchange}{{${exchange}}}:::exchange;\n`;
    });
    mermaidDiagram += `    \n`
    mermaidDiagram += `    %% queues\n`
    mermaidDiagram += `    classDef queue fill:#ede7b1;\n`
    queues.forEach(queue => {
        mermaidDiagram += `    ${queue}[["${queue}"]]:::queue;\n`;
    });
    mermaidDiagram += `    \n`
    mermaidDiagram += `    %% bindings\n`
    bindings.forEach(binding => {
        mermaidDiagram += `    ${binding};\n`;
    });

    return mermaidDiagram;
}

async function fetchRabbitDefinitions({url, username, password}) {
    const authHeader = 'Basic ' + btoa(username + ':' + password);

    const definitionsUrl = url + "/api/definitions";
    const param = {
        method: 'GET',
        headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
        }
    };
    return fetch(definitionsUrl, param)
        .catch(cause => {
            throw new Error("管理APIのアクセスに失敗しました。URL誤りやCORSエラーなどが考えられます。接続設定やログを確認してください。", {cause});
        })
        .then(response => {
            if (!response.ok) {
                console.error("response status is not ok", response);
                throw new Error(`管理APIからデータが取得できませんでした。（status:${response.status}）`);
            }
            return response.json();
        });
}