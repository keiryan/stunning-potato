import { VercelRequest, VercelResponse } from '@vercel/node';
import { validateSlackRequest } from './utils/validateSlackRequest';
import { SlackSlashCommand, SlackResponse } from './types/slack';
import getRawBody from 'raw-body';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get raw body for signature validation
    const rawBody = (await getRawBody(req)).toString();
    
    // Validate Slack request
    const timestamp = req.headers['x-slack-request-timestamp'] as string;
    const signature = req.headers['x-slack-signature'] as string;
    const signingSecret = process.env.SLACK_SIGNING_SECRET as string;

    if (!timestamp || !signature || !signingSecret) {
      return res.status(400).json({ error: 'Missing required headers' });
    }

    const isValid = validateSlackRequest(
      signingSecret,
      signature,
      timestamp,
      rawBody
    );

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid request signature' });
    }

    // Parse the raw body
    const params = new URLSearchParams(rawBody);
    const command: SlackSlashCommand = Object.fromEntries(params) as any;

    // Verify this is the correct command
    if (command.command !== '/recall') {
      return res.status(400).json({ error: 'Invalid command' });
    }

    // Prepare the response
    const response: SlackResponse = {
      text: 'Hello world!',
      response_type: 'ephemeral'
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error processing slash command:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}