import _ from 'underscore';
import Onyx from 'react-native-onyx';
import lodashGet from 'lodash/get';
import ONYXKEYS from '../../ONYXKEYS';
import * as CollectionUtils from '../CollectionUtils';

const allTransactions = {};
Onyx.connect({
    key: ONYXKEYS.COLLECTION.TRANSACTION,
    callback: (transaction, key) => {
        if (!key || !transaction) {
            return;
        }
        const transactionID = CollectionUtils.extractCollectionItemID(key);
        allTransactions[transactionID] = transaction;
    },
});

/**
 * @param {String} transactionID
 */
function createInitialWaypoints(transactionID) {
    Onyx.merge(`${ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}`, {
        comment: {
            waypoints: {
                waypoint0: {},
                waypoint1: {},
            },
        },
    });
}

/**
 * Add a stop to the transaction
 *
 * @param {String} transactionID
 * @param {Number} newLastIndex
 */
function addStop(transactionID) {
    const transaction = lodashGet(allTransactions, transactionID, {});
    const existingWaypoints = lodashGet(transaction, 'comment.waypoints', {});
    const newLastIndex = _.size(existingWaypoints);

    Onyx.merge(`${ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}`, {
        comment: {
            waypoints: {
                [`waypoint${newLastIndex}`]: {},
            },
        },
    });
}

/**
 * Saves the selected waypoint to the transaction
 * @param {String} transactionID
 * @param {String} index
 * @param {Object} waypoint
 */
function saveWaypoint(transactionID, index, waypoint) {
    Onyx.merge(`${ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}`, {
        comment: {
            waypoints: {
                [`waypoint${index}`]: waypoint,
            },
        },
    });
}

function removeWaypoint(transactionID, currentIndex) {
    // Index comes from the route params and is a string
    const index = Number(currentIndex);
    const transaction = lodashGet(allTransactions, transactionID, {});
    const existingWaypoints = lodashGet(transaction, 'comment.waypoints', {});
    const totalWaypoints = _.size(existingWaypoints);

    // Prevents removing the starting or ending waypoint but clear the stored address only if there are only two waypoints
    if (totalWaypoints === 2 && (index === 0 || index === totalWaypoints - 1)) {
        saveWaypoint(transactionID, index, null);
        return;
    }

    const waypointValues = _.values(existingWaypoints);
    waypointValues.splice(index, 1);

    const reIndexedWaypoints = {};
    waypointValues.forEach((waypoint, idx) => {
        reIndexedWaypoints[`waypoint${idx}`] = waypoint;
    });

    // Onyx.merge won't remove the null nested object values, this is a workaround
    // to remove nested keys while also preserving other object keys
    // Doing a deep clone of the transaction to avoid mutating the original object and running into a cache issue when using Onyx.set
    const newTransaction = {
        ...transaction,
        comment: {
            ...transaction.comment,
            waypoints: reIndexedWaypoints,
        },
    };
    Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}`, newTransaction);
}

export {addStop, createInitialWaypoints, saveWaypoint, removeWaypoint};