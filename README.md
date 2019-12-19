# IRC Message Action

This action prints a message to a given IRC Channel. Optionally it waits for a
response from a given user

## Inputs

### `server`
The hostname of the IRC server
    default: 'chat.freenode.net'
    required: true

### `port`
The port number of the IRC server
    default: 6697
    required: true

### `channel`
**Required** IRC channel that will receive the messages

### `channel_key`
IRC channel password

### `nickname`
**Required** IRC nickname

### `sasl_password`
IRC SASL password

### `message`
**Required**  Message to send

### `notice`
Use NOTICE instead of PRIVMSG

default: false

### `tls`
Use TLS to connect to the IRC server

default: true

### `response_allow_from`
Comma seperated list of authenticated accounts allowed to response to an action

### `response_timeout`
Timeout to wait for a response in seconds

default: 60

## Outputs

### `response_from`
nickname of the responding user

### `response`
Response written from an authenticated user

## Example usage
on: [push]

### Example 3: Simple IRC notification of pushes

```yaml
jobs:
  notification:
    runs-on: ubuntu-latest
    name: Notifications
    steps:
    - name: IRC notification
      uses: Gottox/irc-message-action@v1
      with:
        channel: '##mychannel'
        nickname: mynickname
        message: |-
          ${{ github.actor }} pushed ${{ github.event.ref }} ${{ github.event.compare }}
```

### Example 2: Acknowledge an action via IRC

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy Chain
    steps:
    - name: Acknowledge
      id: acknowledge
      uses: Gottox/irc-message-action@v1
      with:
        channel: '##mychannel'
        nickname: mynickname
        response_allow_from: Operator1, Operator2, Operator3
        # 5 hours:
        response_timeout: 18000
        message: |-
          ${{ github.actor }} pushed something: ${{ github.event.compare }}
          Please acknowledge with "ok"!
    - name: Print Acknowledger
      run: echo "${{ steps.response.outputs.response_from }}"
    - name: Check Acknowledge
      run: test "${{ steps.response.outputs.response }}" = "ok"
    - name: Deploy
      run: ./deploy.sh
```