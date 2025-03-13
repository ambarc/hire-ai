# Use the API to send a text message to DeepSeek-R1.

import boto3
import json

from botocore.exceptions import ClientError

# Create a Bedrock Runtime client in the AWS Region of your choice.
client = boto3.client("bedrock-runtime", region_name="us-east-1")

# Set the cross region inference profile ID for DeepSeek-R1
model_id = "us.deepseek.r1-v1:0"

# Define the prompt for the model.
prompt = "Describe the purpose of a 'hello world' program in one line."

# Embed the prompt in DeepSeek-R1's instruction format.
formatted_prompt = f"""
<｜begin▁of▁sentence｜><｜User｜>{prompt}<｜Assistant｜><think>\n
"""

body = json.dumps({
    "prompt": formatted_prompt,
    "max_tokens": 512,
    "temperature": 0.5,
    "top_p": 0.9,
})

try:
    # Invoke the model with the request.
    response = client.invoke_model(modelId=model_id, body=body)

    # Read the response body.
    model_response = json.loads(response["body"].read())
    
    # Extract choices.
    choices = model_response["choices"]
    
    # Print choices.
    for index, choice in enumerate(choices):
        print(f"Choice {index + 1}\n----------")
        print(f"Text:\n{choice['text']}\n")
        print(f"Stop reason: {choice['stop_reason']}\n")
except (ClientError, Exception) as e:
    print(f"ERROR: Can't invoke '{model_id}'. Reason: {e}")
    exit(1)

