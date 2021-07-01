var sellAEvt = function(val) {
    $('#sellB').find('option').each(function(){
        $(this).prop('hidden', false);
    });

    if (val == 'PRICE') {
        $('#sellB').find('option').each(function(){
            if ($(this).val() != 'CONST')
                $(this).prop('hidden', true);
        });
        $('#sellB').val('CONST').change();
    } 
    else {
        $('#sellB').find('option').each(function(){
            if ($(this).val() == val)
                $(this).prop('hidden', true);
        });
        if ($('#sellB').val() == val)
            $('#sellB').val('').change();
    }
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

var sellCondAdd = function() {
    let sellA = $('#sellA').val();
    let sellEQ = $('#sellEQ').val();
    let sellB = $('#sellB').val();
    let sellC = $('#sellC').val();
    let sellBValue = $('#sellBValue').val();
    let errMsg = '';
    console.log(sellA + ',' + sellEQ + ',' + sellB + ',' + sellBValue + ',' + sellC);

    let legal = true;
    if (sellA == '' || sellEQ == '' || sellB == '') {
        legal = false;
        errMsg = '參數不能為空';
    }
    else if (sellA != 'PRICE') {
        if (parseInt(sellBValue) < 0 || parseInt(sellBValue) > 100) {
            legal = false;
            errMsg = '定值範圍只能是介於 0 ~ 100';
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
    console.log(sellAlgo);
    updateSellCond();
}

var updateSellCond = function() {
    if (sellAlgo == undefined)
        return;

    let cond = '';
    let html = '';
    for (let i=0 ; i<sellAlgo.length ; i++) {
        item = sellAlgo[i];
        console.log(item);
        html += '<tr><td>\n';
        html += (i + 1);
        html += '</td><td>\n';

        let cond = '';
        if (item.A.type == 'PRICE')
            cond += '股價'
        else
            cond += item.A.type;

        cond += ' ' + item.E + ' ';
        if (item.B.type == 'CONST')
            cond += item.B.value;
        else
            cond += item.B.type;
        html += cond;

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

    $('#sellB').on('change', function(){
        sellBEvt($(this).val());
    });

    $('#sellCondAdd').on('click', function(){
        sellCondAdd();
    });
}
