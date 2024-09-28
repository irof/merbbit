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
                    return `${source} -->|" ${routing_key} "| ${destination}`;
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
    bindings.forEach(binding=> {
        mermaidDiagram += `    ${binding};\n`;
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