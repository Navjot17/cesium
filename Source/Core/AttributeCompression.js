/*global define*/
define([
        './Cartesian2',
        './Cartesian3',
        './defined',
        './DeveloperError',
        './Math'
    ], function(
        Cartesian2,
        Cartesian3,
        defined,
        DeveloperError,
        CesiumMath) {
    'use strict';

    /**
     * Attribute compression and decompression functions.
     *
     * @exports AttributeCompression
     *
     * @private
     */
    var AttributeCompression = {};

    /**
     * Encodes a normalized vector into 2 SNORM values in the range of [0-rangeMax] following the 'oct' encoding.
     *
     * Oct encoding is a compact representation of unit length vectors.
     * The 'oct' encoding is described in "A Survey of Efficient Representations of Independent Unit Vectors",
     * Cigolle et al 2014: {@link http://jcgt.org/published/0003/02/01/}
     *
     * @param {Cartesian3} vector The normalized vector to be compressed into 2 component 'oct' encoding.
     * @param {Cartesian2} result The 2 component oct-encoded unit length vector.
     * @param {Number} rangeMax The maximum value of the SNORM range. The encoded vector is stored in log2(rangeMax+1) bits.
     * @returns {Cartesian2} The 2 component oct-encoded unit length vector.
     *
     * @exception {DeveloperError} vector must be normalized.
     *
     * @see AttributeCompression.octDecodeInRange
     */
    AttributeCompression.octEncodeInRange = function(vector, rangeMax, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(vector)) {
            throw new DeveloperError('vector is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        var magSquared = Cartesian3.magnitudeSquared(vector);
        if (Math.abs(magSquared - 1.0) > CesiumMath.EPSILON6) {
            throw new DeveloperError('vector must be normalized.');
        }
        //>>includeEnd('debug');

        result.x = vector.x / (Math.abs(vector.x) + Math.abs(vector.y) + Math.abs(vector.z));
        result.y = vector.y / (Math.abs(vector.x) + Math.abs(vector.y) + Math.abs(vector.z));
        if (vector.z < 0) {
            var x = result.x;
            var y = result.y;
            result.x = (1.0 - Math.abs(y)) * CesiumMath.signNotZero(x);
            result.y = (1.0 - Math.abs(x)) * CesiumMath.signNotZero(y);
        }

        result.x = CesiumMath.toSNorm(result.x, rangeMax);
        result.y = CesiumMath.toSNorm(result.y, rangeMax);

        return result;
    };

    /**
     * Encodes a normalized vector into 2 SNORM values in the range of [0-255] following the 'oct' encoding.
     *
     * @param {Cartesian3} vector The normalized vector to be compressed into 2 byte 'oct' encoding.
     * @param {Cartesian2} result The 2 byte oct-encoded unit length vector.
     * @returns {Cartesian2} The 2 byte oct-encoded unit length vector.
     *
     * @exception {DeveloperError} vector must be normalized.
     *
     * @see AttributeCompression.octEncodeInRange
     * @see AttributeCompression.octDecode
     */
    AttributeCompression.octEncode = function(vector, result) {
        return AttributeCompression.octEncodeInRange(vector, 255, result);
    };

    /**
     * Decodes a unit-length vector in 'oct' encoding to a normalized 3-component vector.
     *
     * @param {Number} x The x component of the oct-encoded unit length vector.
     * @param {Number} y The y component of the oct-encoded unit length vector.
     * @param {Number} rangeMax The maximum value of the SNORM range. The encoded vector is stored in log2(rangeMax+1) bits.
     * @param {Cartesian3} result The decoded and normalized vector
     * @returns {Cartesian3} The decoded and normalized vector.
     *
     * @exception {DeveloperError} x and y must be an unsigned normalized integer between 0 and rangeMax.
     *
     * @see AttributeCompression.octEncodeInRange
     */
    AttributeCompression.octDecodeInRange = function(x, y, rangeMax, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        if (x < 0 || x > rangeMax || y < 0 || y > rangeMax) {
            throw new DeveloperError('x and y must be a signed normalized integer between 0 and ' + rangeMax);
        }
        //>>includeEnd('debug');

        result.x = CesiumMath.fromSNorm(x, rangeMax);
        result.y = CesiumMath.fromSNorm(y, rangeMax);
        result.z = 1.0 - (Math.abs(result.x) + Math.abs(result.y));

        if (result.z < 0.0)
        {
            var oldVX = result.x;
            result.x = (1.0 - Math.abs(result.y)) * CesiumMath.signNotZero(oldVX);
            result.y = (1.0 - Math.abs(oldVX)) * CesiumMath.signNotZero(result.y);
        }

        return Cartesian3.normalize(result, result);
    };

    /**
     * Decodes a unit-length vector in 2 byte 'oct' encoding to a normalized 3-component vector.
     *
     * @param {Number} x The x component of the oct-encoded unit length vector.
     * @param {Number} y The y component of the oct-encoded unit length vector.
     * @param {Cartesian3} result The decoded and normalized vector.
     * @returns {Cartesian3} The decoded and normalized vector.
     *
     * @exception {DeveloperError} x and y must be an unsigned normalized integer between 0 and 255.
     *
     * @see AttributeCompression.octDecodeInRange
     */
    AttributeCompression.octDecode = function(x, y, result) {
        return AttributeCompression.octDecodeInRange(x, y, 255, result);
    };

    /**
     * Packs an oct encoded vector into a single floating-point number.
     *
     * @param {Cartesian2} encoded The oct encoded vector.
     * @returns {Number} The oct encoded vector packed into a single float.
     *
     */
    AttributeCompression.octPackFloat = function(encoded) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(encoded)) {
            throw new DeveloperError('encoded is required.');
        }
        //>>includeEnd('debug');
        return 256.0 * encoded.x + encoded.y;
    };

    var scratchEncodeCart2 = new Cartesian2();

    /**
     * Encodes a normalized vector into 2 SNORM values in the range of [0-255] following the 'oct' encoding and
     * stores those values in a single float-point number.
     *
     * @param {Cartesian3} vector The normalized vector to be compressed into 2 byte 'oct' encoding.
     * @returns {Number} The 2 byte oct-encoded unit length vector.
     *
     * @exception {DeveloperError} vector must be normalized.
     */
    AttributeCompression.octEncodeFloat = function(vector) {
        AttributeCompression.octEncode(vector, scratchEncodeCart2);
        return AttributeCompression.octPackFloat(scratchEncodeCart2);
    };

    /**
     * Decodes a unit-length vector in 'oct' encoding packed in a floating-point number to a normalized 3-component vector.
     *
     * @param {Number} value The oct-encoded unit length vector stored as a single floating-point number.
     * @param {Cartesian3} result The decoded and normalized vector
     * @returns {Cartesian3} The decoded and normalized vector.
     *
     */
    AttributeCompression.octDecodeFloat = function(value, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        //>>includeEnd('debug');

        var temp = value / 256.0;
        var x = Math.floor(temp);
        var y = (temp - x) * 256.0;

        return AttributeCompression.octDecode(x, y, result);
    };

    /**
     * Encodes three normalized vectors into 6 SNORM values in the range of [0-255] following the 'oct' encoding and
     * packs those into two floating-point numbers.
     *
     * @param {Cartesian3} v1 A normalized vector to be compressed.
     * @param {Cartesian3} v2 A normalized vector to be compressed.
     * @param {Cartesian3} v3 A normalized vector to be compressed.
     * @param {Cartesian2} result The 'oct' encoded vectors packed into two floating-point numbers.
     * @returns {Cartesian2} The 'oct' encoded vectors packed into two floating-point numbers.
     *
     */
    AttributeCompression.octPack = function(v1, v2, v3, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(v1)) {
            throw new DeveloperError('v1 is required.');
        }
        if (!defined(v2)) {
            throw new DeveloperError('v2 is required.');
        }
        if (!defined(v3)) {
            throw new DeveloperError('v3 is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        //>>includeEnd('debug');

        var encoded1 = AttributeCompression.octEncodeFloat(v1);
        var encoded2 = AttributeCompression.octEncodeFloat(v2);

        var encoded3 = AttributeCompression.octEncode(v3, scratchEncodeCart2);
        result.x = 65536.0 * encoded3.x + encoded1;
        result.y = 65536.0 * encoded3.y + encoded2;
        return result;
    };

    /**
     * Decodes three unit-length vectors in 'oct' encoding packed into a floating-point number to a normalized 3-component vector.
     *
     * @param {Cartesian2} packed The three oct-encoded unit length vectors stored as two floating-point number.
     * @param {Cartesian3} v1 One decoded and normalized vector.
     * @param {Cartesian3} v2 One decoded and normalized vector.
     * @param {Cartesian3} v3 One decoded and normalized vector.
     */
    AttributeCompression.octUnpack = function(packed, v1, v2, v3) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(packed)) {
            throw new DeveloperError('packed is required.');
        }
        if (!defined(v1)) {
            throw new DeveloperError('v1 is required.');
        }
        if (!defined(v2)) {
            throw new DeveloperError('v2 is required.');
        }
        if (!defined(v3)) {
            throw new DeveloperError('v3 is required.');
        }
        //>>includeEnd('debug');

        var temp = packed.x / 65536.0;
        var x = Math.floor(temp);
        var encodedFloat1 = (temp - x) * 65536.0;

        temp = packed.y / 65536.0;
        var y = Math.floor(temp);
        var encodedFloat2 = (temp - y) * 65536.0;

        AttributeCompression.octDecodeFloat(encodedFloat1, v1);
        AttributeCompression.octDecodeFloat(encodedFloat2, v2);
        AttributeCompression.octDecode(x, y, v3);
    };

    /**
     * Pack texture coordinates into a single float. The texture coordinates will only preserve 12 bits of precision.
     *
     * @param {Cartesian2} textureCoordinates The texture coordinates to compress.  Both coordinates must be in the range 0.0-1.0.
     * @returns {Number} The packed texture coordinates.
     *
     */
    AttributeCompression.compressTextureCoordinates = function(textureCoordinates) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(textureCoordinates)) {
            throw new DeveloperError('textureCoordinates is required.');
        }
        //>>includeEnd('debug');

        // Move x and y to the range 0-4095;
        var x = (textureCoordinates.x * 4095.0) | 0;
        var y = (textureCoordinates.y * 4095.0) | 0;
        return 4096.0 * x + y;
    };

    /**
     * Decompresses texture coordinates that were packed into a single float.
     *
     * @param {Number} compressed The compressed texture coordinates.
     * @param {Cartesian2} result The decompressed texture coordinates.
     * @returns {Cartesian2} The modified result parameter.
     *
     */
    AttributeCompression.decompressTextureCoordinates = function(compressed, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(compressed)) {
            throw new DeveloperError('compressed is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        //>>includeEnd('debug');

        var temp = compressed / 4096.0;
        var xZeroTo4095 = Math.floor(temp);
        result.x = xZeroTo4095 / 4095.0;
        result.y = (compressed - xZeroTo4095 * 4096) / 4095;
        return result;
    };

    return AttributeCompression;
});
