import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { text, extractionType, schema } = body;

    // Validate required fields
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    if (!extractionType) {
      return NextResponse.json({ error: 'Extraction type is required' }, { status: 400 });
    }
    if (!schema) {
      return NextResponse.json({ error: 'Schema is required' }, { status: 400 });
    }

    // Create a prompt based on extraction type
    let prompt = '';
    switch (extractionType) {
      case 'medications':
        prompt = `Extract all medications from the following text. Include name, dosage, and frequency when available.
        
Text: ${text}

Only include information that is explicitly mentioned in the text. Do not make assumptions or add information not present in the text. Return an empty array if no medications are found..`;
        break;
      default:
        return NextResponse.json({ error: `Unsupported extraction type: ${extractionType}` }, { status: 400 });
    }

    // Call OpenAI API for extraction
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a medical data extraction assistant. Extract structured data from medical text according to the specified schema. Only return valid JSON without any additional text." },
        { role: "user", content: prompt }
      ],

      // TODO(ambar): solve this with reflection.
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "medications",
          schema: {
            type: "object",
            properties: {
            elements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  dosage: { type: "string" },
                  frequency: { type: "string" },
                },
                required: ["name", "dosage", "frequency"]
              }
            },
          } } } },
    });

    // Parse the response
    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('Empty response from OpenAI');
    }

    const parsedResponse = JSON.parse(responseContent);
    
    // Return the extracted data
    return NextResponse.json(parsedResponse, { status: 200 });
    
  } catch (error) {
    console.error('Error in extract API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
} 