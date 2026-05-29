const VALID_ACTIONS = new Set(['critique', 'bottlenecks', 'pacing', 'clues', 'starter_flow']);
const VALID_NODE_TYPES = new Set(['startingPoint', 'pluginAction', 'decodeAction', 'result', 'metaPuzzle', 'finale']);

const actionLabels = {
  critique: 'Critique This Flow',
  bottlenecks: 'Find Bottlenecks',
  pacing: 'Improve Puzzle Pacing',
  clues: 'Suggest Missing Clues',
  starter_flow: 'Generate a Starter Flow From a Theme',
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

function sanitizeText(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return value.replace(/[<>]/g, '').slice(0, 500);
}

function sanitizeFlow(flow) {
  const nodes = Array.isArray(flow?.nodes) ? flow.nodes.slice(0, 80) : [];
  const edges = Array.isArray(flow?.edges) ? flow.edges.slice(0, 140) : [];
  const nodeIds = new Set();

  const sanitizedNodes = nodes
    .map((node) => {
      const id = sanitizeText(node?.id).slice(0, 120);
      if (!id) return null;
      nodeIds.add(id);
      const type = sanitizeText(node?.type, 'result');
      return {
        id,
        type: VALID_NODE_TYPES.has(type) ? type : 'result',
        label: sanitizeText(node?.data?.label || node?.label || type, type),
        position: {
          x: Number.isFinite(node?.position?.x) ? Math.round(node.position.x) : 0,
          y: Number.isFinite(node?.position?.y) ? Math.round(node.position.y) : 0,
        },
      };
    })
    .filter(Boolean);

  const sanitizedEdges = edges
    .map((edge) => {
      const source = sanitizeText(edge?.source).slice(0, 120);
      const target = sanitizeText(edge?.target).slice(0, 120);
      if (!source || !target || !nodeIds.has(source) || !nodeIds.has(target)) return null;
      return {
        id: sanitizeText(edge?.id || `${source}-${target}`).slice(0, 140),
        source,
        target,
      };
    })
    .filter(Boolean);

  return {
    nodes: sanitizedNodes,
    edges: sanitizedEdges,
  };
}

function extractJson(text) {
  if (!text || typeof text !== 'string') return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;

  try {
    return JSON.parse(raw.slice(firstBrace, lastBrace + 1));
  } catch (error) {
    console.error('Failed to parse model JSON:', error);
    return null;
  }
}

function normalizeCoachResult(value) {
  const data = value && typeof value === 'object' ? value : {};
  return {
    summary: typeof data.summary === 'string' ? data.summary.slice(0, 1200) : 'The AI provider returned an incomplete response.',
    strengths: Array.isArray(data.strengths) ? data.strengths.filter((item) => typeof item === 'string').slice(0, 8) : [],
    risks: Array.isArray(data.risks) ? data.risks.filter((item) => typeof item === 'string').slice(0, 8) : [],
    recommendedChanges: Array.isArray(data.recommendedChanges)
      ? data.recommendedChanges.filter((item) => typeof item === 'string').slice(0, 10)
      : [],
    suggestedNodes: Array.isArray(data.suggestedNodes)
      ? data.suggestedNodes
          .filter((node) => node && typeof node === 'object' && typeof node.type === 'string' && typeof node.label === 'string')
          .slice(0, 10)
          .map((node) => ({
            id: typeof node.id === 'string' ? node.id.slice(0, 120) : undefined,
            type: VALID_NODE_TYPES.has(node.type) ? node.type : 'result',
            label: node.label.slice(0, 120),
            reason: typeof node.reason === 'string' ? node.reason.slice(0, 400) : undefined,
          }))
      : [],
    suggestedEdges: Array.isArray(data.suggestedEdges)
      ? data.suggestedEdges
          .filter((edge) => edge && typeof edge === 'object' && typeof edge.source === 'string' && typeof edge.target === 'string')
          .slice(0, 12)
          .map((edge) => ({
            source: edge.source.slice(0, 120),
            target: edge.target.slice(0, 120),
            reason: typeof edge.reason === 'string' ? edge.reason.slice(0, 400) : undefined,
          }))
      : [],
  };
}

function buildPrompt({ action, theme, flow }) {
  return `You are an expert escape room puzzle-flow consultant. Analyze the supplied React Flow puzzle map and return only valid JSON.

Your analysis must be direct, practical, and specific. Evaluate puzzle pacing, bottlenecks, clue fairness, physical/cognitive balance, team parallelization, reset complexity, and finale satisfaction.

Selected action: ${actionLabels[action] || action}
Room theme, if relevant: ${theme || 'Not provided'}

Flow JSON:
${JSON.stringify(flow, null, 2)}

Return exactly this JSON object shape and no markdown:
{
  "summary": "A concise expert summary of the flow and the biggest design implication.",
  "strengths": ["Specific strength 1", "Specific strength 2"],
  "risks": ["Specific risk 1", "Specific risk 2"],
  "recommendedChanges": ["Actionable change 1", "Actionable change 2"],
  "suggestedNodes": [
    { "id": "optional-id", "type": "startingPoint|pluginAction|decodeAction|result|metaPuzzle|finale", "label": "Node label", "reason": "Why this node helps" }
  ],
  "suggestedEdges": [
    { "source": "source-node-id-or-label", "target": "target-node-id-or-label", "reason": "Why this connection helps" }
  ]
}

If the action is starter_flow, suggest a coherent starter flow using suggestedNodes and suggestedEdges. If the existing flow is empty, still provide useful starter recommendations. Keep lists focused and avoid generic advice.`;
}

async function callOpenAI(prompt) {
  const model = process.env.AI_MODEL || 'gpt-4.1-mini';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a senior escape room game designer and puzzle-flow analyst. Return only valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'OpenAI request failed.');
  }

  return payload?.choices?.[0]?.message?.content || '';
}

async function callGemini(prompt) {
  const model = process.env.AI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.4,
        responseMimeType: 'application/json',
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Gemini request failed.');
  }

  return payload?.candidates?.[0]?.content?.parts?.map((part) => part.text).join('\n') || '';
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed', message: 'Use POST for AI Flow Coach requests.' });
  }

  if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
    return jsonResponse(503, {
      error: 'ai_provider_not_configured',
      message: 'AI Flow Coach is installed, but no provider key is configured. Add OPENAI_API_KEY or GEMINI_API_KEY in Netlify environment variables and redeploy.',
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'invalid_json', message: 'Request body must be valid JSON.' });
  }

  const action = VALID_ACTIONS.has(body.action) ? body.action : 'critique';
  const theme = sanitizeText(body.theme, '');
  const flow = sanitizeFlow(body.flow || {});

  if (flow.nodes.length === 0 && action !== 'starter_flow') {
    return jsonResponse(400, {
      error: 'empty_flow',
      message: 'Add at least one node to the canvas before asking the AI Flow Coach to analyze the flow.',
    });
  }

  try {
    const prompt = buildPrompt({ action, theme, flow });
    const rawText = process.env.OPENAI_API_KEY ? await callOpenAI(prompt) : await callGemini(prompt);
    const parsed = extractJson(rawText);

    return jsonResponse(200, normalizeCoachResult(parsed));
  } catch (error) {
    console.error('AI Flow Coach failed:', error);
    return jsonResponse(502, {
      error: 'ai_provider_failed',
      message: error instanceof Error ? error.message : 'AI provider request failed.',
    });
  }
};
