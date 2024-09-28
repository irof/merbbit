async function renderDiagram(mermaid, mermaidText) {
    return mermaid.render('mermaidDiagram', mermaidText)
        .then(result => result.svg);
}

async function definitionsToMermaidText(definitions) {
    const bindings = definitions.bindings;

    let mermaidDiagram = 'graph LR;\n';

    let exchanges = new Set();
    let queues = new Set();
    let connections = [];

    bindings.forEach(binding => {
        const {source, destination, destination_type, routing_key} = binding;

        if (destination_type === "queue") {
            queues.add(destination);
        }

        // Exchangeが空の場合はdefault-exchange扱い
        const exchange = source ? source : "default-exchange";

        // Exchangeノードを追加 (circleとして表現)
        if (source) {
            exchanges.add(exchange);
        }

        if (routing_key) {
            if (routing_key === "#") {
                // "#"の1文字はエスケープしてやる必要がある
                connections.push(`${exchange} -->|" #35; "| ${destination}`);
            } else {
                connections.push(`${exchange} -->|" ${routing_key} "| ${destination}`);
            }
        } else {
            // 空はラベルを出さない
            connections.push(`${exchange} --> ${destination}`);
        }
    });

    // ノードの形と色を https://www.rabbitmq.com/tutorials の表現に合わせる
    exchanges.forEach(exchange => {
        mermaidDiagram += `    ${exchange}{{${exchange}}}:::exchange;\n`;
    });
    queues.forEach(queue => {
        mermaidDiagram += `    ${queue}[["${queue}"]]:::queue;\n`;
    });
    mermaidDiagram += `    classDef exchange fill:#fae0e4;\n`
    mermaidDiagram += `    classDef queue fill:#ede7b1;\n`

    connections.forEach(connection => {
        mermaidDiagram += `    ${connection};\n`;
    });

    return mermaidDiagram;
}

async function fetchRabbitDefinitions({url, username, password}) {
    try {
        const authHeader = 'Basic ' + btoa(username + ':' + password);

        const definitionsUrl = url + "/api/definitions";
        const response = await fetch(definitionsUrl, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            console.error("fetchに失敗", response);
        } else {
            return await response.json();
        }
    } catch (e) {
        console.error("管理APIのアクセスに失敗しました。CORS、URL誤り、認証情報誤りなどが考えられます。", e);
    }
}