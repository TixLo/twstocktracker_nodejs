var sellAEvt = function(val) {
    $('#sellBValue').val('');
    $('#sellB').find('option').each(function(){
        $(this).prop('hidden', false);
    });

    $('#sellEQ').find('option').each(function(){
        $(this).prop('hidden', false);
    });
    $('#sellC').prop('hidden', false);
    $('#StopLossDesc').prop('hidden', true);

    if (val == 'PRICE') {
        $('#sellB').find('option').each(function(){
            if ($(this).val() != 'CONST')
                $(this).prop('hidden', true);
        });
        $('#sellB').val('CONST').change();
    } 
    else if (val == 'StopLoss') {
        $('#sellEQ').find('option').each(function(){
            if ($(this).val() != '<=')
                $(this).prop('hidden', true);
        });
        $('#sellEQ').val('<=').change();

        $('#sellB').find('option').each(function(){
            if ($(this).val() != 'CONST')
                $(this).prop('hidden', true);
        });
        $('#sellB').val('CONST').change();
        $('#sellC').prop('hidden', true);
        $('#StopLossDesc').prop('hidden', false);
    }
    else {
        $('#sellB').find('option').each(function(){
            if ($(this).val() == val)
                $(this).prop('hidden', true);
        });
        if ($('#sellB').val() == val)
            $('#sellB').val('').change();
    }

    // reset others
    $('#sellEQ').val('').change();
    $('#sellB').val('').change();
    $('#sellC').val('').change();
    $('#sellBValue').val('');
}

var sellBEvt = function(val) {
    if (val == 'CONST') {
        $('#sellBValue').prop('hidden', false);
    }
    else {
        $('#sellBValue').prop('hidden', true);
        $('#sellBValue').val('');
    }
}

var sellEQEvt = function(val) {
    if (val == 'trendUp' || val == 'trendDown') {
        $('#sellB').prop('hidden', true);
    }
    else {
        $('#sellB').prop('hidden', false);
    }
}

var sellCondAdd = function() {
    let sellA = $('#sellA').val();
    let sellEQ = $('#sellEQ').val();
    let sellB = $('#sellB').val();
    let sellC = $('#sellC').val();
    let sellBValue = $('#sellBValue').val();
    let errMsg = '';
    //console.log(sellA + ',' + sellEQ + ',' + sellB + ',' + sellBValue + ',' + sellC);

    let legal = true;
    if (sellA == 'StopLoss') {
        if (sellBValue == '') {
            legal = false;
            errMsg = '停損點數值不能為空';
        }
    }
    else if (sellC == '' || sellA == '' || sellEQ == '' || (sellB == '' && (sellEQ != 'trendUp' && sellEQ != 'trendDown'))) {
        legal = false;
        errMsg = '參數不能為空';
    }
    else if (sellEQ == 'trendUp' || sellEQ == 'trendDown') {
        if ($('#sellC').val() < 2) {
            legal = false;
            errMsg = '天數至少要2天以上';
        }
    }
    else if (sellA != 'PRICE') {
        if (sellA == 'StopLoss') {
            if (parseInt(sellBValue) >=0 ) {
                legal = false;
                errMsg = '停損點只能是負值';
            }
        }
        else {
            if (parseInt(sellBValue) < 0 || parseInt(sellBValue) > 100) {
                legal = false;
                errMsg = '定值範圍只能是介於 0 ~ 100';
            }
        }
    }
    else if (sellB == 'CONST') {
        if (sellBValue.length == 0)
            legal = false;
        if (parseFloat(sellBValue) < 0.0)
            legal = false;
        errMsg = '定值輸入錯誤, 不能為空或是負值';
    }

    if (!legal) {
        alert(errMsg);
        return;
    }

    sellAlgo.push({
        A: {type: sellA},
        E: sellEQ,
        B: {type: sellB, value: sellBValue},
        C: parseInt(sellC)
    });
    //console.log(sellAlgo);
    updateSellCond();
}

var updateSellCond = function() {
    if (sellAlgo == undefined)
        return;

    $('#StopLossDesc2').prop('hidden', true);
    let cond = '';
    let html = '';
    let cnt = 0;
    for (let i=0 ; i<sellAlgo.length ; i++) {
        item = sellAlgo[i];
        //console.log(item);
        html += '<tr><td>\n';
        if (item.A.type == 'StopLoss') {
            html += '*';
            $('#StopLossDesc2').prop('hidden', false);
        }
        else {
            html += (cnt + 1);
            cnt++;
        }
        html += '</td><td>\n';

        let cond = '';
        if (item.A.type == 'PRICE')
            cond += '股價'
        else if (item.A.type == 'StopLoss')
            cond += '停損點'
        else
            cond += item.A.type;

        if (item.E == 'trendUp')
            cond += ' 趨勢往上 ';
        else if (item.E == 'trendDown')
            cond += ' 趨勢往下 ';
        else
            cond += ' ' + item.E + ' ';

        if (item.B.type == 'CONST')
            cond += item.B.value;
        else
            cond += item.B.type;

        if (item.A.type == 'StopLoss')
            cond += '%';

        html += cond;

        if (item.A.type != 'StopLoss')
            html += ',連續' + item.C + '天';

        html += '</td><td>\n';
        html += '<img class="Image pt-0 pb-0" '
              + 'src="../images/del.png" width="26" height="26" '
              + 'onClick="delSellCond(' + i + ')">\n';
        html += '</td></tr>\n';

    }
    $('#sellCondList').html(html);
}

var delSellCond = function(index) {
    sellAlgo.splice(index, 1);
    updateSellCond();
}

var regSellEvent = function() {
    $('#sellA').on('change', function(){
        sellAEvt($(this).val());
    });

    $('#sellEQ').on('change', function(){
        sellEQEvt($(this).val());
    });

    $('#sellB').on('change', function(){
        sellBEvt($(this).val());
    });

    $('#sellCondAdd').on('click', function(){
        sellCondAdd();
    });
}
