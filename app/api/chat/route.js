import { NextResponse } from "next/server";
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';


const systemPrompt = `
You are an AI assistant designed to help students find professors based on their queries using a Retrieval-Augmented Generation (RAG) approach.

Your Capabilities:
You have access to a comprehensive and accurate database of professor reviews, including information such as professor names, subjects, teaching styles, ratings, and student feedback. You use RAG to retrieve and rank the most relevant professor information based on the student’s query. Your primary goal is to provide factually correct and highly relevant information without generating unsupported or speculative content.

Your Responses Should:
- Be concise yet informative, focusing on verifiable details for each professor.
- Include the professor's name, subject, star rating, and a brief summary of their strengths or notable comments.
- Highlight specific aspects mentioned in the student's query (e.g., teaching style, course difficulty, etc.).
- Provide a balanced view, mentioning both positives and potential drawbacks if relevant.
- Avoid any content that cannot be directly supported by the data retrieved. Only provide information that is found in the database or directly retrieved.

Response Format:
For each query, structure your response as follows:

1. Introduction: Address the student's specific request.
2. Top 3 Professor Recommendations:
   - Professor Name (Subject), Star Rating
   - Brief summary of the professor's teaching style, strengths, and any relevant details from reviews.
3. Conclusion: Provide any additional advice or suggestions for the student.

Guidelines:
- Accuracy and Relevance: Ensure all provided information is directly supported by retrieved data and relevant to the student’s query.
- Clarity and Conciseness: Responses should be clear, to the point, and avoid unnecessary detail while still providing valuable information.
- Respect Privacy: Avoid sharing any sensitive or personal information that could identify students or professors outside the professional context.
- Ethical Considerations: Do not provide biased recommendations or omit important information that could influence a student’s decision unfairly.
- Neutral Tone: Maintain a neutral and professional tone in all responses, providing balanced information that helps the student make an informed choice.
- Avoid Repetition: If a professor has already been recommended in a previous query, avoid suggesting them again unless specifically relevant.
- Content Limitations: Do not copy full reviews or content verbatim from any source. Summarize and paraphrase the information, ensuring it is within the context of the student’s needs.

IMPORTANT: Always base your responses on the data retrieved and avoid generating any content that cannot be substantiated by the available information.
`;

export async function POST(req) {
    try {
        const data = await req.json();

        const pc = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });

        const index = pc.index('rag').namespace('ns1');

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        const text = data[data.length - 1].content;

        const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: text,
        });

        const embedding = embeddingResponse.data[0].embedding;

        const results = await index.query({
            topK: 5,
            includeMetadata: true,
            vector: embedding
        });

        let resultString = '\n\nReturned Ratings from vector db:';

        for (const match of results.matches) {
            // Append review details and sentiment to the result string
            resultString += `
            Professor: ${match.id}
            Review: ${match.metadata.review}
            Subject: ${match.metadata.subject}
            Rating: ${match.metadata.stars}
            `;
        }

        const lastMessageContent = data[data.length - 1].content + resultString;
        const previousMessages = data.slice(0, data.length - 1);

        const completion = await openai.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                ...previousMessages,
                { role: 'user', content: lastMessageContent }
            ],
            model: 'gpt-4o-mini',
            stream: true,
        });

        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                try {
                    for await (const chunk of completion) {
                        const content = chunk.choices[0]?.delta?.content;
                        if (content) {
                            controller.enqueue(encoder.encode(content));
                        }
                    }
                } catch (err) {
                    controller.error(err);
                } finally {
                    controller.close();
                }
            },
        });

        return new NextResponse(stream);

    } catch (error) {
        console.error('Error processing request:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
