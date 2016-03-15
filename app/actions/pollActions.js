import { push } from 'react-router-redux';
import namer from '../namer';
import baseRef from '../firebase';

export const NEW_POLL = 'NEW_POLL';
export const RESET_POLLS = 'RESET_POLLS';
export const ATTEMPT_CHANGE_POLL_KEY = 'ATTEMPT_CHANGE_POLL_KEY';
export const CHANGE_POLL_KEY = 'CHANGE_POLL_KEY';

export function resetPolls() {
  return (dispatch, getState) => {
    // only for users
    if (getState().user.isUser) {
      const uid = getState().user.uid;
      const pollsRef = baseRef.child(`polls`);
      pollsRef.orderByChild('uid').equalTo(uid).once('value', (data) => {
        const dataVal = data.val();
        const transformedData = {};
        // transform data from Firebase to Redux structure
        Object.keys(dataVal).forEach((key) => {
          const obj = Object.assign({}, dataVal[key]);
          obj.pollKey = obj.poll_key;
          delete obj.poll_key;
          transformedData[key] = obj;
        });

        dispatch({
          type: RESET_POLLS,
          polls: transformedData,
          uid,
        });
      });
    }
  };
}

export function newPoll() {
  return (dispatch, getState) => {
    // create a new poll object
    const uid = getState().user.uid;
    const pollKey = namer();
    const pollRef = baseRef.child('polls').push({
      poll_key: pollKey,
      uid,
    });

    // add the new poll id to the list of polls
    const pollId = pollRef.key();
    const userRef = baseRef.child(`users/${uid}/polls`);
    userRef.update({
      [pollId]: true,
    });

    // dispatch the action
    dispatch({
      type: NEW_POLL,
      pollId,
      pollKey,
    });

    dispatch(push(`/s/${pollId}`));
  };
}

function changePollKey(pollId) {
  return (dispatch) => {
    const newKey = namer();
    const pollsRef = baseRef.child(`polls`);

    pollsRef.orderByChild('pollKey').equalTo(newKey).once('value', (data) => {
      // key already exists, try another one
      if (data.exists()) return changePollKey(pollId)(dispatch);

      // update the name in Firebase
      const pollRef = baseRef.child(`polls/${pollId}`);
      pollRef.update({
        poll_key: newKey,
      });

      // update local store
      dispatch({
        type: CHANGE_POLL_KEY,
        pollKey: newKey,
        pollId,
      });
    });
  };
}

export function attemptChangePollKey(pollId) {
  return (dispatch, getState) => {
    // currently another process active
    if (getState().poll.awaitingNameChange) return;

    dispatch({ type: ATTEMPT_CHANGE_POLL_KEY });
    changePollKey(pollId)(dispatch);
  };
}