
// Forward declaration to avoid circular import
export let enqueueFilteredInfo;

// Set the enqueue function after import
export const setEnqueueFilteredInfo = (fn) => {
  enqueueFilteredInfo = fn;
};

const LLM_API_URL = process.env.LLM_API_URL;
const LLM_MODEL = process.env.LLM_MODEL;
const LLM_API_KEY = process.env.LLM_API_KEY;

export const callLLM = async (
  systemPrompt,
  userPrompt,
  toolName,
  toolSchema
) => {
  if (!LLM_API_KEY) {
    throw new Error("LLM_API_KEY is not configured");
  }

  const response = await fetch(LLM_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LLM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: toolName,
            description: "Extract structured data from content",
            parameters: toolSchema,
          },
        },
      ],
      tool_choice: {
        type: "function",
        function: {
          name: toolName,
        },
      },
    }),
  });
  console.log(`LLM response: ${response}`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

  if (!toolCall?.function?.arguments) {
    return null;
  }

  console.log("Trying to parse LLM response:", toolCall.function.arguments);
  try {
    return JSON.parse(toolCall.function.arguments);
  } catch (error) {
    console.error("Failed to parse LLM response:", error);
    return null;
  }
};
